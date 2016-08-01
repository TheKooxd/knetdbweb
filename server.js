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

	par = request.url.slice(2);
	par = JSON.parse('{"' + decodeURI(par.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}')
	console.log(par);
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
			searchDatabase(par.term, function(result){
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


function checkLogin(callback) //Needs somekind of lock function for encryptor but not big deal yet
{
fs.readFile('cred/'+par.id, 'utf8', function (err, data) {
  if (err) callback(403);
  if(data != undefined)
  {
  console.log(data);
  usrInfo = JSON.parse(data);
  encrypt(par.pass, function(usrPass){
  	console.log(usrPass);

  
  console.log(usrInfo.cred.pass);
  if(usrPass == usrInfo.cred.pass)
  {
  	callback(200);
  }
  else
  {
  	callback(403);
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
		if(reqUsr.info.admin != undefined)
		{
		if(reqUsr.info.admin == "true")
		{
		fs.readdir("cred/", function (err, files) {
    if (err) {
        throw err;
    }
    console.log(files);
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
			console.log(par);
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

function setAttention(callback)
{
	getUsrInfo(function(code){
		if(code!=403)
		{
			usrInfo.info.attention = "true";
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
		console.log(usrInfo.info.name);
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(usrInfo.info.name);
		resCode = 200;
		next();
	}
	if(par.origin == "usrPage" && par.request == "usrInfo")
	{
		console.log(usrInfo.info.name);
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(JSON.stringify(usrInfo));
		resCode = 200;
		next();
	}
	if(par.origin == "usrPage" && resCode == 200 && par.request == "attention")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write("Attention set");
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
console.log("Server is running");
