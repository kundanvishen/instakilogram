var bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');
var cors = require('cors');
var express = require('express');
var jwt = require('jwt-simple');
var moment = require('moment');
var mongoose = require('mongoose');
var path = require('path');
var request = require('request');
var config = require('./config');

var User = mongoose.model('User', new mongoose.Schema({
	instagramId: { type: String, index: true },
	email: { type: String, unique: true, lowercase: true },
	password: { type: String, select: false },
	username: String,
	fullName: String,
	picture: String,
	accessToken: String
}));

mongoose.connect(config.db);

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

function createToken(user){
	var payload = {
		exp: moment().add(14, 'days').unix(),
		iat: moment.unix(),
		sub: user._id
	};

	return jwt.encode(payload, config.tokenSecret);
}; // createToken

function isAuthenticated(req, res, next) {
	if(!(req.headers && req.headers.Authorization)) {
		return res.status(400).send({message: 'Invalid JWT!'});
	}

	var header = req.headers.authorization.split(' ');
	var token = header[1];
	var payload = jwt.decode(token, config.tokenSecret);
	var now = moment.unix();

	if(now > payload.exp) {
		return res.status(400).send({message: 'Token has expired.'});
	}

	User.findById(payload.sub, function(err, user){
		if(!user) {
			return res.status(400).send({message: 'User no longer exists'})
		}

		req.user = user;
		next();
	})
}

app.listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});

app.get('*', function(req, res){
	res.send('Listening')
})