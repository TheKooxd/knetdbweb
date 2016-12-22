var http = require('http');
var connect = require('connect');
path = require("path");
var jsonfile = require('jsonfile')
var fs = require('fs');
var session = require('./node_modules/sesh/lib/core').magicSession();

var crypto = require('crypto'),
algorithm = 'aes-256-ctr',
password = 'asdkjkEjkajsdlkasd445446asd';
var app = connect();
var par;
var resCode;
var usrId;
var usrInfo;
var grpInfo;
var reqId;
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
	par = JSON.parse('{"' + decodeURI(par.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}')
	console.log("Incoming Request from session "+request.session.data.user +": ")
	console.log(".")
	console.log(par);
	console.log(".")
	usrId = request.session.data.user;
	if(par.request == "attention")
		{
			setAttention(function(code){
				resCode = code;
				next();
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

		if(par.origin == "crtGrp" && par.request == "crtGrp")
		{
			crtGrp(function(code){
				resCode = code;
				next();
			});
		}

	if(par.origin == "login")
	{

		getRequest(function(code){
			resCode = code;
			next();
		}
		);
		
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
		getGrpInfo(function(callback){
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



function getRequest(callback) //Figures out what to do with request data
{
	if(par.origin == "login") //If request comes from login page
	{
		console.log(par.id+" trys to log in!");
		checkLogin(function(reg){
			callback(reg);
		});
	}
}

function getUsrInfo(callback)
{

fs.readFile('cred/'+usrId, 'utf8', function (err, data) {
  if (err)
  {
  	callback(403);
  }
  if(data != undefined)
  {

  	  usrInfo = JSON.parse(data);
  	callback(usrInfo);
}
});
}

function getGrpInfo(callback)
{
		console.log("GRP");
fs.readFile('grp/'+par.id, 'utf8', function (err, data) {
  if (err)
  {
  	  	console.log(err);
  	callback(403);
  }
  if(data != undefined)
  {

  	  grpInfo = JSON.parse(data);
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
			console.log(data);
			if(term == 'admin')
			{
				console.log("hoi");
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

function checkLogin(callback) //Needs somekind of lock function for encryptor but not big deal yet
{
fs.readFile('cred/'+par.id, 'utf8', function (err, data) {
  if (err) callback(403);
  if(data != undefined)
  {
  usrInfo = JSON.parse(data);
  encrypt(par.pass, function(usrPass){

  if(usrPass == usrInfo.cred.pass)
  {
  	callback(200);
  }
  else
  {
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
        throw err;
    }
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
        throw err;
    }
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
						console.log(err);
					}
					else{
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
			id.length++;
			var grp = {
				"info" : {
					"name": par.name,
					"location": par.location,
					"leader": par.leader,
					"gsm": par.gsm,
					"id": id.length
				}
			};
			id.length++;
				jsonfile.writeFile("grp/"+id.length, grp, function(err){
					if(err)
					{
						console.log(err);
					}
					else{
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
			usrInfo.info.attention = "true";
			usrInfo.info.attentionReason = par.comment;
			jsonfile.writeFile("cred/"+usrInfo.cred.id, usrInfo, function(err){
					if(err)
					{
						callback(403);
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
	var usrCache;
	getUsrs(function(users){
		var index = 1;
		users.forEach(function(user){
		fs.readFile('cred/'+user, 'utf8', function (err, data) {
		usrCache = JSON.parse(data);
		if(usrCache.info.attention == "true")
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
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write("User logged off");
		next();
	}
	if(par.origin == "usrPage" && par.request == "usrName")
	{
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
	if(resCode == 200 && par.request == "changeUsrInfo")
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
		response.write("<a href='/grpUsr.html?success=true'>Group Saved Click Me to Contiune</a>");
		response.end();
		
	};
	if(par.request == "crtUsr")
	{
		response.writeHead(301, {"Content-Type: ": "text/plain"});
		response.write("<a href='/crtUsr.html?success=true'>User Saved Click Me to Contiune</a>");
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


app.use(getPar);
app.use(responder);


http.createServer(app).listen(8000);
console.log("Server is running On port 8000");
