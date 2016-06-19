var http = require('http');
var connect = require('connect');
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
  console.log(dec);
	callback(dec);
}

function getPar(request, response, next) //Reads URL parameters to object and saves them to global variable "par"
{
	encrypt("reservi", function(data){
		console.log(data);
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

function getUsrInfo(callback)
{
fs.readFile('cred/'+usrId, 'utf8', function (err, data) {
  if (err) throw err;
  usrInfo = JSON.parse(data);
  	callback(usrInfo);

});
}


function checkLogin(callback) //Needs somekind of lock function for encryptor but not big deal yet
{
fs.readFile('cred/'+par.id, 'utf8', function (err, data) {
  if (err) throw err;
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
});
}


function toArray(data, callback)
{
	var data = data.toString().split('\n');
	callback(data)
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
		response.write(usrInfo.info.name);
		next();
	}
	if(par.origin == "usrPage" && resCode == 200 && par.request == "isAdmin")
	{
		response.writeHead(200, {"Content-Type: ": "text/plain"});
		response.write(usrInfo.info.admin);
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
