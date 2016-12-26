var http = require('http');
var connect = require('connect');
path = require("path");
var jsonfile = require('jsonfile')
var fs = require('fs');
var session = require('./node_modules/sesh/lib/core').magicSession();
var redis = require("redis"),
client = redis.createClient();

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
function encrypt(text, callback){
	var cipher = crypto.createCipher(algorithm,password)
	var crypted = cipher.update(text,'utf8','hex')
	crypted += cipher.final('hex');
	callback(crypted)
}

function decrypt(text, callback){

	var decipher = crypto.createDecipher(algorithm,password)
	var dec = decipher.update(text,'hex','utf8')
	dec += decipher.final('utf8');
	callback(dec);
}
function getPar(request, response, next) //Reads URL parameters to object and saves them to global variable "par"
{
	console.log("=======================================================================")
	par = request.url.slice(2);
	console.log(par);
	par = JSON.parse('{"' + decodeURI(par.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}')
	console.log("Incoming Request from session "+request.session.data.user +": ")
	console.log(".")
	console.log(par);
	console.log(".")
	usrId = request.session.data.user;
	buUsrId = request.session.data.user;
	client.incr("totalReq");
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
			getUsrInfo(function(usrCache){
				if(usrCache.info.operator == "true") {
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
			getUsrInfo(function(usrCache){
				if(usrCache.info.operator == "true") {
					client.get(par.term, function(err, reply) {
						if(err) {
							client.incr('totalErr');
							client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' requested system stats but redis cache responded with error');
						}
						stat = reply;
						next();
					})
				}
				else {
					stat = 403;
					next();
				}
			});
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
				console.log(resCode);
				next();
			});
		}

		if(par.request == "changeGrpInfo")
		{
			changeGrpInfo(par.term, par.value,par.id , function(code){
				resCode = code;
				console.log(resCode);
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
				resCode = 200;
				next();
			});
		}

		if(par.origin == "usrPage")
		{
			if(par.request == "usrName" || par.request == "usrInfo")
			{
				if(par.usrId != undefined)
				{
					usrId = par.usrId;
				}
				else
				{
					usrId = request.session.data.user;
				}
				getUsrInfo(function(callback){
					usrInfo = callback;
					next();
				}
				);
			}


			if(par.request == "logout")
			{
				request.session.data.user = "Guest";
				next();
			}

			if(par.request == "isAdmin")
			{
				getUsrInfo(function(data){

				});
				next();
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

function getUsrInfo(callback)
{
	fs.readFile('cred/'+usrId, 'utf8', function (err, data) {
		if (err)
		{
			client.incr('totalErr');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' requested user info but system responded with error');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>'+err);
			callback(403);
		}
		if(data != undefined)
		{
			usrInfo = JSON.parse(data);
			if(buUsrId != usrId) {
				client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font>User '+buUsrId+' requested user info for user '+usrInfo.cred.id);
			};
			callback(usrInfo);
		}
	});
}

function getGrpInfo(id, callback)
{
	console.log("GRP");
	fs.readFile('grp/'+id, 'utf8', function (err, data) {
		if (err)
		{
			client.incr('totalErr');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' requested group info but system responded with error');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>'+err);
			callback(403);
		}
		if(data != undefined)
		{
			grpInfo = JSON.parse(data);
			client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font>User '+buUsrId+' requested group info for group '+grpInfo.info.name);
			callback(grpInfo);
		}
	});
}

function changeUsrInfo(term, value, id, callback)
{
	getUsrInfo(function(usr){
		usrId = id;
		getUsrInfo(function(data){
			if(usr.info.admin == "true")
			{
				client.lpush('log', '['+Date()+'] <font class="err">[ADMIN]</font>User '+buUsrId+' changed '+data.info.name+'\'s '+term+' to '+value);
				if(term == 'admin')
				{
					data.info.admin = value;
				}
				if(term == 'id')
				{
					data.cred.id = value;
					id = value;
				}
				if(term == 'group')
				{
					data.info.group = value;
				}
				if(term == 'email')
				{
					value = value.replace(/%40/g, "@");
					data.info.email = value;
				}
				if(term == 'gsm')
				{
					data.info.gsm = value;
				}
				if(term == "attention")
				{
					data.info.attention = value;
				}

				if(term == "attentionResponse")
				{
					if(value != undefined) {
						value = value.replace(/%3F/g, "?");
					}
					data.info.attentionResponse = value;
				}


				if(term == "staff")
				{
					data.info.staff = value;
				}

				if(term == "user")
				{
					data.info.user = value;
				}

				if(term == "operator")
				{
					data.info.operator = value;
				}

				jsonfile.writeFile("cred/"+id, data, function(err){
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
	})
}

function changeGrpInfo(term, value, id, callback)
{
	getUsrInfo(function(usr){
		getGrpInfo(id, function(data){
			if(usr.info.admin == "true")
			{
				console.log(data);
				if(term == 'description')
				{
					data.info.description = value;
				}
				if(term == 'gsm')
				{
					data.info.gsm = value;
				}
				if(term == 'leader')
				{
					data.info.leader = value;
				}
				if(term == 'location')
				{
					data.info.location = value;
				}
				if(term == 'name')
				{
					data.info.name = value;
				}
				if(term == "attention")
				{
					data.info.attention = value;
				}

				jsonfile.writeFile("grp/"+id, data, function(err){
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
	})
}

function checkLogin(callback) //Needs somekind of lock function for encryptor but not big deal yet
{
	fs.readFile('cred/'+par.id, 'utf8', function (err, data) {
		if (err) {
			client.incr('totalErr');
			client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>System tried access "/cred" but FS gave error: '+err);
			callback(403)
		}
		if(data != undefined)
		{
			usrInfo = JSON.parse(data);
			encrypt(par.pass, function(usrPass){
				console.log(usrInfo.info.user);
				if(usrPass == usrInfo.cred.pass && usrInfo.info.user == "true")
				{
					callback(200);
				}
				else
				{
					if(usrInfo.info.user != "true")
					{
						callback(402);
						console.log(usrInfo.info.name + " tried to log in with disabled account!")
					}
					callback(403);
					console.log(par.id+" had wrong password")
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
	var data = data.toString().split('\n');
	callback(data)
}

function getUsrs(callback)
{

	getUsrInfo(function(reqUsr){
		if(reqUsr.info != undefined)
		{
			if(reqUsr.info.admin == "true")
			{
				fs.readdir("cred/", function (err, files) {
					if (err) {
						client.incr('totalErr');
						client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' tried to list all the users but couldn\'t reach it');
					}
					client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font> User '+buUsrId+' listed all users in system. Result was '+files.length);
					callback(files)
				});
			}
			else
			{
				callback(403);
			}
		}
	});
}

function getGrp(callback)
{

	getUsrInfo(function(reqUsr){
		if(reqUsr.info != undefined)
		{
			if(reqUsr.info.admin == "true")
			{
				fs.readdir("grp/", function (err, files) {
					if (err) {
						client.incr('totalErr');
						client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' tried to list all the groups but couldn\'t reach it');
					}
					client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font> User '+buUsrId+' listed all groups in system. Result was '+files.length);
					callback(files)
				});
			}
			else
			{
				callback(403);
			}
		}
	});
}

function crtUsr(callback)
{

	getUsrInfo(function(reqUsr){
		encrypt(par.pass, function(pass){
			if(reqUsr.info.admin == "true")
			{
				var usr = {
					"cred" : {
						"id": par.id,
						"pass": pass
					},
					"info" : {
						"name": par.name,
						"gsm": par.gsm,
						"email": par.email,
						"admin": par.admin,
						"attention": "false",
						"user": "true",
						"staff": par.staff,
						"operator": par.op
					}
				};
				usr.info.name = par.name;
				usr.cred.id = par.id;
				usr.info.admin = par.admin;

				usr.cred.pass = pass;
				usr.info.gsm = par.gsm;
				usr.info.email = par.gsm;
				jsonfile.writeFile("cred/"+par.id, usr, function(err){
					if(err)
					{
						client.incr('totalErr');
						client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' tried to create user but couldn\'t do that it');
					}
					else{
						client.lpush('log', '['+Date()+'] <font class="err">[ADMIN]</font> User '+buUsrId+' Created new user account '+usr.cred.id+' for '+usr.info.name);
						callback(200);
					}
				});

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
	getUsrInfo(function(reqUsr){
		getGrp(function(id){
			if(reqUsr.info.admin == "true")
			{
				console.log(par.name);
				id.length++;
				var grp = {
					"info" : {
						"name": par.name.replace(/\+/g, ' '),
						"location": par.location,
						"leader": par.leader,
						"gsm": par.gsm,
						"id": id.length
					}
				};
				jsonfile.writeFile("grp/"+id.length, grp, function(err){
					if(err)
					{
						client.incr('totalErr');
						client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' tried to create new group but couldn\'t do that');
					}
					else{
						client.lpush('log', '['+Date()+'] <font class="err">[ADMIN]</font> User '+buUsrId+' Created new group '+grp.info.id+' for '+grp.info.name);
						callback(200);
					}
				});

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
	getUsrInfo(function(code){
		if(code!=403)
		{
			client.lpush('log', '['+Date()+'] User '+buUsrId+' set attention request.');
			usrInfo.info.attention = "true";
			usrInfo.info.attentionReason = par.comment.replace(/%3F/g, "?");
			usrInfo.info.attentionResponse = undefined;
			jsonfile.writeFile("cred/"+usrInfo.cred.id, usrInfo, function(err){
				if(err)
				{
					client.incr('totalErr');
					client.lpush('log', '['+Date()+'] <font class="err">[ERR]</font>User '+buUsrId+' tried to set attention but FS gave error');
				}
				else{
					callback(200);
				}
			});

		}
	});
}

function getAttention(callback)
{
	var res1 = [];
	getUsrInfo(function(reqUsr){
		if(reqUsr.info.admin == "true")
		{
			client.lpush('log', '['+Date()+'] <font class="admin">[ADMIN]</font>User '+buUsrId+' is reading attentions.');
			var usrCache;
			getUsrs(function(users){
				var index = 1;
				users.forEach(function(user){
					fs.readFile('cred/'+user, 'utf8', function (err, data) {
						usrCache = JSON.parse(data);
						if(usrCache.info.attention == "true" && usrCache.cred.id != usrId)
						{
							res1.push(usrCache.cred.id);

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
	});

}


function userArr(user, callback)
{
	var res1 = [];
	fs.readFile('cred/'+user, 'utf8', function (err, data) {
		usrCache = JSON.parse(data);
		if(usrCache.info.attention == "true")
		{
			res1.push(usrCache.cred.id);

		}
		callback(res1);
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
		client.lpush('log', '['+Date()+'] User '+request.session.data.user+' requested name. Responded with '+usrInfo.info.name);
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(usrInfo.info.name);
		resCode = 200;
		next();
	}
	if(par.origin == "usrPage" && par.request == "usrInfo")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(JSON.stringify(usrInfo));
		resCode = 200;
		next();
	}
	if(par.request == "stats")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		console.log('Reponse: '+stat);
		response.write(stat.toString());
		resCode = 200;
		next();
	}
	if(par.request == "grpInfo")
	{
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
		response.write(usrInfo.info.admin);
		resCode = 200;
		next();
	}
	if(par.origin == "usrMgr" && par.request == "totalUsers")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(resCode.toString());
		resCode = 200;
		next();
	}
	if(par.origin == "grpMgr" && par.request == "totalGroups")
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
		console.log("GIVING SESSION COOKIE");
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
		
	};
	if(par.request == "crtGrp")
	{
		response.writeHead(301, {"Content-Type: ": "text/plain"});
		response.write("<a href='/grpMgmt.html?success=true'>Group Saved Click Me to Contiune</a>");
		response.end();
		
	};
	if(par.request == "crtUsr")
	{
		response.writeHead(301, {"Content-Type: ": "text/plain"});
		response.write("<a href='/crtUsr.html?success=true'>User Saved Click Me to Contiune</a>");
		response.end();
		
	};
	if(par.request == "log")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(log.toString());
		response.end();
		
	};
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
		client.set('totalErr', 0)
	};

	http.createServer(app).listen(8000);
	console.log("Server is running On port 8000");
});