var http = require('http');
var connect = require('connect');
var fs = require('fs');
var session = require('./node_modules/sesh/lib/core').magicSession();

var app = connect();
var par;
var resCode;
var usrId;
var usrInfo;

function getPar(request, response, next) //Reads URL parameters to object and saves them to global variable "par"
{
	xor_str("kaksi", function(data){
		console.log(data);
		decrypt_str(data, function(data){
		console.log(data);
	});
	});
	par = request.url.slice(2);
	par = JSON.parse('{"' + decodeURI(par.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}')
	console.log(par);
	if(par.origin == "login")
	{
		console.log(request.session);
		console.log("getPar ready");
		getRequest(function(code){
			console.log(code);
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
				console.log(result);
			});
		}
	}

	if(par.origin == "usrPage")
	{
		if(par.request == "usrName")
		{
		console.log(request.session);
		usrId = request.session.data.user;
		getUsrInfo(function(callback){
			usrInfo = callback;
			next();
		}
		);
		}

		if(par.request == "logout")
		{
		console.log(request.session);
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

function checkLogin(callback) //Needs somekind of lock function for encryptor but not big deal yet
{
	fs.readFile("../kat/cred/"+par.id, 'utf8', function (err,data) { //Read user credentials file
 	 if (err) {
    	console.log(err);
 	 }
 	 inCrypt(par.pass, function(){
 	 outCrypt(function(usrPass){ //Anonymous function to wait for outCrypt's() callback (There is some latency becase of file systems)
 	 //	usrPass[0] = usrPass[0].substring(0, usrPass[0].length - 1);
 	 	console.log("usrPass: "+usrPass[0]);
 	 	console.log("relPass: "+data);
 	 	if(data == usrPass[0])
 	 	{
 	 		callback(200);
 	 	}
 	 	else
 	 	{
 	 		callback(403);
 	 	}
 	});
	});
 	 });

}

function inCrypt(data, callback)
{
	 fs.writeFile("io.dat", data, function(err,data) { //Inputs user given password to c++ API encrypter to check password
    if(err) {
       console.log(err);
    }
    setTimeout(function(){
    callback();
    },100);
    console.log(data);
}); 
}

function outCrypt(callback)
{
	fs.readFile("out.dat", 'utf8', function (err,data) { //Read user credentials file
 	 if (err) {
    	console.log(err);
 	 }
 	 toArray(data, function(array){
 	 		console.log(array);
 	 		callback(array);
 	 });
	});
}

function toArray(data, callback)
{
	var data = data.toString().split('\n');
	callback(data)
}

function giveSession(request, response, next)
{
	console.log("on");
	request.session.data.user = "1234";

}

function getUsrInfo(callback)
{
		fs.readFile("../kat/usr/"+usrId, 'utf8', function (err,data) 
		{ 
 	 if (err) {
    	console.log(err);
 	 }
 	 inCrypt(data, function(){
 	 outCrypt(function(usrInfo){
 	 	usrInfo[2]++
 	 	if(Math.sqrt(Math.pow(usrInfo[1]*61,2)) == usrInfo[2]++)
		 	 {
		 	 	usrInfo[2] = "true";
		 	 }
		else
		{
			usrInfo[2] = "false";
		}
  	 	callback(usrInfo);
 	 	
 	 });
 	 });
	});
}

function searchDatabase(term, callback)
{
	fs.readFile('../kat/database/"-57+', 'utf8', function (err,data){
		toArray(data, function(index){
		index.forEach(getTags, function(tags){
			//console.log(tags);
		});
	});
	});
}


function decrypt(data, callback)
{
	inCrypt(data, function(){
		outCrypt(function(data){
			callback(data);
		});
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
	if(par.origin == "usrPage" && resCode == 200 && par.request == "usrName")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(usrInfo[0]);
		next();
	}
	if(par.origin == "usrPage" && resCode == 200 && par.request == "isAdmin")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(usrInfo[2]);
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
