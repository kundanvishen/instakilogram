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
} // isAuthenticated()

app.post('/auth/login', function(req, res){
	// The +password parameter in the query tells Mongoose to include the password field. We have to do this because we explicitly told Mongoose to exclude the password field from all User mod
	User.findOne({email: req.body.email}, '+password', function(err, user){
		if(!user) {
			return res.status(401).send({message: 'Incorrect email'});
		}

		bcrypt.compare(req.body.password, user.password, function(err, isMatch){
			if(!isMatch) {
				return res.status(401).send({message: 'Incorrect Password'});
			}

			user = user.toObject();
			delete user.password;

			var token = createToken(user);
			res.send({token: token, user: user});
		});
	});
}); // auth/login

app.post('/auth/instagram', function(req, res){
	var accessTokenUrl = 'https://api.instagram.com/oauth/access_token';
	var params = {
		client_id: req.body.clientId,
		redirect_uri: req.body.redirectUri,
		client_secret: config.clientSecret,
		code: req.body.code,
		grant_type: 'authorization_code'
	};

	request.post({url: accessTokenUrl, form: params, json: true}, function(e, r, body) {
		if(req.headers.authorization) {
			// link user accounts
			User.findOne({instagramId: body.user.id}, function(err, existingUser){
				var token = req.headers.authorization.split(' ')[1];
				var payload = jwt.decode(token, config.tokenSecret);

				User.findById(payload.sub, '+password', function(err, localUser){
					if(!localUser){
						return res.status(400).send({message: 'User not found'});
					}

					// Merge two accounts.
					if(existingUser) {
						existingUser.email = localUser.email;
						existingUser.password = localUser.password;

						localUser.remove();

						existingUser.save(function(){
							var token = createToken(existingUser);
							return res.send({token: token, user: existingUser});
						})
					} else {
						// link current email account with the Instagram Profile Information
						localUser.instagramId = body.user.id;
						localUser.username = body.user.username;
						localUser.fullName = body.user.full_name;
						localUser.picture = body.user.profile_picture;
						localUser.accessToken = body.access_token;

						localUser.save(function(){
							var token = createToken(localUser);
							res.send({token: token,user: localUser});
						});
					}
				})
			})
		} else {
			// create new user account or return an existing one
			User.findOne({instagramId: req.body.user.id}, function(err, existingUser){
				if(existingUser) {
					var token = createToken(existingUser);
					return res.send({token: token, user: existingUser});
				}

				var user = new User({
					instagramId: body.user.id,
					username: body.user.username,
					fullName: body.user.full_name,
					picture: body.user.profile_picture,
					accessToken: body.access_token
				});

				user.save(function(){
					var token = createToken(user);
					res.send({token: token, user: user});
				});
			}); // User.findOne()
		}
	})
});

app.listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});

app.get('*', function(req, res){
	res.send('Listening')
})