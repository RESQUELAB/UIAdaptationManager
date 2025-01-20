const crypto = require('crypto')
const { Server } = require("socket.io")
const { readFileSync } = require("fs")
const { createServer } = require("https")
const { c, check, array, obj } = require('../check.js')
const Client = require('./clientModel.js')

const { WebSocket } = require('ws');
const { format } = require('path')
const fs = require('fs');
const os = require('os')


const { MongoClient } = require('mongodb');

const url = 'mongodb://127.0.0.1:27017';
const db_connection = new MongoClient(url);
console.log("MONGO-DB CONNECTION")

async function connectToDatabase() {
	try {
		await db_connection.connect();
		console.log("Connected to MongoDB!");
	} catch (err) {
		console.error("MongoDB connection error:", err);
	}
}

connectToDatabase();

const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const exp = require('constants')
const { group } = require('console')

const db = db_connection.db('test');
// const usersCollection = db.collection('users');
const usersCollection = db.collection('auth_user');
const surveysCollection = db.collection('user_surveys');

function verifyDjangoPassword(password, storedHash) {
	const [algorithm, iterations, salt, hash] = storedHash.split('$');
	const key = crypto.pbkdf2Sync(password, salt, parseInt(iterations), 32, 'sha256').toString('base64');
	return key === hash;
}

const hashPassword = (password) => {
	const salt = crypto.randomBytes(16).toString('base64');
	const iterations = 36000;
	const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64');
	return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
};

const insertDjangoUser = async (usersCollection, userData) => {
	// Find the maximum value of the `id` field
	const maxIdUser = await usersCollection.find({}).sort({ id: -1 }).limit(1).toArray();
	// If there are no users, set `newId` to 1, otherwise increment the max `id`
	const newId = maxIdUser.length > 0 ? maxIdUser[0].id + 1 : 1;

	const hashedPassword = hashPassword(userData.password);


	const userDocument = {
		// _id: new ObjectId(), 
		id: newId,
		password: hashedPassword,
		last_login: null,
		is_superuser: false,
		username: userData.username,
		first_name: userData.first_name || '',
		last_name: userData.last_name || '',
		email: userData.email || '',
		is_staff: false,
		is_active: true,
		date_joined: new Date(),
		group: userData.group, 
		experiment: userData.experiment,
		birth: userData.birth,
		gender: userData.gender,
		occupations: userData.occupations,
		field: userData.field,
		background: userData.background,
		usageFrequencyPC: userData.usageFrequencyPC,
		usageFrequencySmartphone: userData.usageFrequencySmartphone,
		usageFrequencyTablet: userData.usageFrequencyTablet,
		usageFrequencyConsole: userData.usageFrequencyConsole,
	};
	console.log("insertamos:: ", userDocument)
	await usersCollection.insertOne(userDocument);
	console.log("fallo!")
};


const loginUser = async (usersCollection, username, password) => {
	const user = await usersCollection.findOne({ username: username });

	if (!user) {
		console.log("Not found.")
		throw new Error('User not found');
	}

	let isPasswordCorrect = verifyDjangoPassword(password, user.password);

	if (!isPasswordCorrect) {
		throw new Error('Incorrect password');
	}

	return user;
};


const getTotalUsersForExperiment = async (usersCollection, experimentName) => {
    try {
		console.log("exp name: ", experimentName)
        let totalUsers = await usersCollection.countDocuments({ experiment: experimentName });
        return totalUsers;
    } catch (err) {
        console.error("Error fetching total users for experiment: ", err);
        return 0; // Default to 0 if there's an error
    }
};

const assignUserToGroup = async (totalUsersForExperiment, totalGroups) => {
    // Logic for assigning users to groups
    let assignedGroup = totalUsersForExperiment % totalGroups + 1;
    return assignedGroup;
};


class CommsController {
	constructor() {
		this.clients = {}
		this.port = 9999
		this.io = new Server(this.port, { cors: { origin: "*" } })

		this.password = "uiadapt"

		this.parameters = {}
		this.groupDefinitions = {}

		// Get the server's IP address
		const interfaces = os.networkInterfaces()
		this.ip = Object.keys(interfaces)
			.map((iface) => interfaces[iface].find((iface) => iface.family === 'IPv4' && !iface.internal))
			.filter((iface) => iface)
			.map((iface) => iface.address)[0]


		// Handshake Auth parsing
		this.io.use((socket, next) => {
			let auth = socket.handshake.auth
			socket.sessionID = auth.sessionID || null
			socket.username = auth.username || 'unnamed'
			socket.page = auth.page || null
			socket.mutations = auth.mutations || {}
			socket.all_mutations = auth.all_mutations || {}
			next()
		})

		this.io.on("connection", (socket) => {
			// Strange case of duplicate creation on electron app
			if (socket.page == null) {
				return
			}

			if (socket.sessionID == null) {
				socket.sessionID = this.getNewSessionID()
				socket.emit('setSessionID', socket.sessionID)
				c.log(socket.sessionID.substr(0, 8), 'NEW-CLIENT', `New client on login page`)
			}

			socket.on('updateState', (value) => {
				let sess = socket.sessionID
				let client = this.clients[sess]
				//console.log("THIS IS THE CLIENT TO UPDATE: ", client)
				client.updateState(value)
				console.log("THIS IS THE VALUE RECEIVED: ", value)
			})

			socket.on('askForAgent', (data) => {
				let sess = socket.sessionID
				let client = this.clients[sess]
				//console.log("THIS IS THE CLIENT TO UPDATE: ", client)
				// client.updateState(value)
				console.log("THIS IS THE VALUE RECEIVED: ", data)

				let page = 'catalog.html'
				if(data.catalogue_finished){
					page = 'questionnaire.html'
				}

				if(data.method == "Non-Adaptive"){
					let options = {
						clientId: sess,
						agent: 'agent',
						agentValue: 'NA'
					  }

					  this.clientAction(null, "agent", options);
					  options = {
						clientId: sess,
						location: 'location',
						locationValue: page
					  }
					  this.clientAction(null, "location", options);
				}else if (data.method == "HCI-HF"){
					let options = {
						clientId: sess,
						agent: 'agent',
						agentValue: 'HCI'
					  }
					  this.clientAction(null, "agent", options);
					  
					  options = {
						clientId: sess,
						location: 'location',
						locationValue: page
					  }
					  this.clientAction(null, "location", options);
				}
			})

			socket.on('loginRequest', async (data) => {
				let sess = socket.sessionID;
				let client = this.clients[sess];

				let username = data.username;
				let password = data.password;

				console.log("THIS IS THE USERNAME: ", username);
				console.log("THIS IS THE PASSWORD: ", password);
				
				let experimentVariables = this.getParameters()
				try {
					// let user = await usersCollection.findOne({ username: username });
					try {
						let user = await loginUser(usersCollection, username, password);

						if (user.group == 1 || user.group == 2){
							client.socket.emit('mutation', 'category', 'trips')
							client.mutations.category = 'trips'
						} else if(user.group == 3 || user.group == 4){
							client.socket.emit('mutation', 'category', 'courses')
							client.mutations.category = 'courses'
						}

						// START THE AGENT RIGHT NOW.
						let options = {
							clientId: sess,
							agent: 'agent',
							agentValue: 'HCI'
						  }
						  this.clientAction(null, "agent", options);

						console.log("LOGGED:: ", user)
						console.log("LOGGED:: ", user.group)
						client.db_user_id = user.id
						client.setGroup(user.group)
						// Login Successfull 
						client.socket.emit('loginResponse', { success: true,
							params: {
								"group": user.group,
								"groupDefinition": this.getGroupDefinitionsByID(user.group),
								"session": experimentVariables.session,
								"userProfile": user,
							} });
						client.socket.emit('setExperimentSession', experimentVariables.session)
						c.log(`${socket.sessionID.substr(0, 8)}, LOGIN SUCCESS`);
					} catch (error) {
						console.log("ERROR:: ", error)
						client.socket.emit('loginResponse', { success: false, message: 'El usuario o contraseña son incorrectos.' });
						c.log(`${socket.sessionID.substr(0, 8)}, LOGIN_FAIL`);
					}
				} catch (err) {
					client.socket.emit('loginResponse', { success: false, message: 'Error en el servidor' });
					c.log(`${socket.sessionID.substr(0, 8)}, LOGIN_FAIL`);
				}
			});
			
			socket.on('logoutRequest', async () => {
				let sess = socket.sessionID;
				let client = this.clients[sess];

				client.socket.emit('logoutResponse', { success: true });
				client.status = client.status + 1
			});

			
			socket.on('experimentCompleted', async() => {
				let sess = socket.sessionID;
				let client = this.clients[sess];

				client.status = client.status + 1
			});
			

			socket.on('surveyResponse', async (data) => {
				let sess = socket.sessionID;
				let client = this.clients[sess];
			
				let surveyResponses = data;
			
				// Get experiment variables for the current session, like group and experiment name
				let experimentVariables = this.getParameters();

				if(client.db_user_id === -1){
					try {
						let user = await usersCollection.findOne({ username: username });
						client.db_user_id = user.id
					} catch (error) {
						console.log("ERROR:: ", error)
						client.socket.emit('surveyResponseAcknowledgment', { success: false, message: 'Error on looking for user in database.' });
						c.log(`${socket.sessionID.substr(0, 8)}, Survey Failed.`);
					}
				}
				let userID = client.db_user_id;
				let group = client.group;
				let domain = client.mutations.category;
			
				let surveyData = {
					userID: userID,
					group: group,
					domain: domain,
					experiment: experimentVariables.name,
					responses: surveyResponses,
					timestamp: new Date()
				};
			
				try {
					let existingSurvey = await surveysCollection.findOne({ userID: userID, domain: domain, experiment: experimentVariables.name });
					
					if (existingSurvey) {
						client.socket.emit('surveyResponseAcknowledgment', { success: false, message: 'Survey already completed for this domain.' });
						c.log(`${socket.sessionID.substr(0, 8)}, SURVEY_FAIL_ALREADY_COMPLETED`);
					} else {
						await surveysCollection.insertOne(surveyData);
			
						client.socket.emit('surveyResponseAcknowledgment', { success: true });
						client.status = client.status + 1
						c.log(`${socket.sessionID.substr(0, 8)}, SURVEY_SUCCESS`);
					}
				} catch (err) {
					client.socket.emit('surveyResponseAcknowledgment', { success: false, message: 'Server error' });
					c.log(`${socket.sessionID.substr(0, 8)}, SURVEY_FAIL_SERVER_ERROR`);
				}
			});
			
			

			socket.on('registerRequest', async (data) => {
				let sess = socket.sessionID;
				let client = this.clients[sess];

				let username = data.username;
				let password = data.password;

				let first_name = data.first_name
				let last_name = data.last_name
				let birth = data.birth
				let gender = data.gender
				let occupations = data.occupations
				let field = data.field
				let background = data.background
				let usageFrequencyPC = data.usageFrequencyPC
				let usageFrequencySmartphone = data.usageFrequencySmartphone
				let usageFrequencyTablet = data.usageFrequencyTablet
				let usageFrequencyConsole = data.usageFrequencyConsole


				let experimentVariables = this.getParameters()

				// Get the total number of users registered for this experiment
				let totalUsersForExperiment = await getTotalUsersForExperiment(usersCollection, experimentVariables.name);

				// Assign the user to a group based on the total number of users in the experiment
				let assignedGroup = await assignUserToGroup(totalUsersForExperiment, experimentVariables.totalGroups);
				

				let userData = {
					username: username,
					password: password,
					first_name: first_name,
					last_name: last_name,
					email: username,
					group: assignedGroup, 
					experiment: experimentVariables.name,
					birth: birth,
					gender: gender,
					occupations: occupations,
					field: field,
					background: background,
					usageFrequencyPC: usageFrequencyPC,
					usageFrequencySmartphone: usageFrequencySmartphone,
					usageFrequencyTablet: usageFrequencyTablet,
					usageFrequencyConsole: usageFrequencyConsole,
				};

				client.setGroup(assignedGroup);

				console.log("THIS IS THE USERNAME: ", username);
				console.log("THIS IS THE PASSWORD: ", password);
				console.log("THIS IS THE ASSIGNED GROUP: ", assignedGroup);
				console.log("Total users for experiment: ", totalUsersForExperiment);

				try {
					let existingUser = await usersCollection.findOne({ username: username });

					if (existingUser) {
						client.socket.emit('registerResponse', { success: false, message: 'El usuario ya existe' });
						c.log(`${socket.sessionID.substr(0, 8)}, REGISTER_FAIL_USER_EXISTS`);
					} else {
						await insertDjangoUser(usersCollection, userData);
						client.socket.emit('registerResponse', { success: true });
						c.log(`${socket.sessionID.substr(0, 8)}, REGISTER_SUCCESS`);
					}
				} catch (err) {
					client.socket.emit('registerResponse', { success: false, message: 'Error en el servidor' });
					c.log(`${socket.sessionID.substr(0, 8)}, REGISTER_FAIL`);
				}
			});

			socket.on('click', (value) => {
				// console.log(typeof(value))
				let sess = socket.sessionID
				let client = this.clients[sess]

				let all_mutat = JSON.stringify(socket.all_mutations)
				// THIS IS TO SEND INFORMATION TO THE AGENT!
				// client.agent.send(all_mutat)

				if (value.includes('confirmPurchaseBtn')) {
					let client = this.clients[socket.sessionID];
					client.setFinishedTask(1)
				}
				let { theme, language, display, font_size, information, category } = socket.mutations;
				let agentType = client.getAgentType()
				// c.log(`${socket.sessionID.substr(0,8)}, CLICK, ${client.finishedTask},  ${theme}, ${language}, ${display}, ${font_size}, ${information}, ${category}, ${value}`)
				c.log(`${socket.sessionID.substr(0, 8)}, CLICK, ${agentType}, ${theme}, ${language}, ${display}, ${font_size}, ${information}, ${category}, ${value}`)
			})

			socket.on('scroll', (value) => {
				let client = this.clients[socket.sessionID]
				let { theme, language, display, font_size, information, category } = socket.mutations;
				let agentType = client.getAgentType()
				// c.log(`${socket.sessionID.substr(0,8)}, SCROLL, ${client.finishedTask}, ${theme}, ${language}, ${display}, ${font_size}, ${information}, ${category}, ${value}`)
				c.log(`${socket.sessionID.substr(0, 8)}, SCROLL, ${agentType}, ${theme}, ${language}, ${display}, ${font_size}, ${information}, ${category}, ${value}`)
			})

			socket.on('updateName', (loginInfoMsg) => {
				console.log("Update name: ", loginInfoMsg.username)
				this.getClient(loginInfoMsg.sessionID).name = loginInfoMsg.username
				let client = this.clients[socket.sessionID]
				// c.log(`${socket.sessionID.substr(0,8)}, nameUpdate, ${client.finishedTask}, ${loginInfoMsg.username}`)
				c.log(`${socket.sessionID.substr(0, 8)}, nameUpdate, ${loginInfoMsg.username}`)
			})

			this.createClient(socket)
		})

		this.io.on('disconnect', (socket) => {
			socket.send()
			let c = this.getClient(socket.sessionID)

			c.log('DISCONNECT', `Client ${c.name} disconnected.`)
			this.deleteClient(socket.id)
		})
	}
	
	setGroupDefinitions(groupDefinitions){
		this.groupDefinitions = groupDefinitions
	}

	getGroupDefinitions(){
		return this.groupDefinitions
	}

	getGroupDefinitionsByID(id) {
		const group = this.groupDefinitions.find(g => g.group === id);
		return group ? group : `Group with ID ${id} not found`;
	  }

	setParameters(parameters){
		this.parameters = parameters
	}

	getParameters(){
		return this.parameters
	}
	
	getServerInfo() {
		return { ip: this.ip, port: this.port }
	}

	getServerPassword() {
		return this.password
	}

	createAgentSocket(client, agentType) {
		const HOST = "ws://127.0.0.1:"
		//  DEFAULT PORT TO AGENT-SERVER 9998
		// let PORT = "9998"
		let PORT = "9997"
		if (client.isLearning()) {
			// THE LEARNING-SERVER iS 9997
			PORT = "9997"
		}
		const ws = new WebSocket(HOST + PORT);
		ws.on('open', () => {
			console.log(client.name, ' is now connected to the Agent server');
		});

		ws.on('message', (message) => {
			console.log(`Received message from AGENT: ${message}`);
			let full_msg = this.read_message(message)

			let msg_type = full_msg.type
			if (msg_type == 'init') {
				let msg_val = full_msg.value
				full_msg.type = "init_response"
				full_msg.user_id = client.socket.sessionID
				full_msg.domain = client.mutations.category
				full_msg.db_user_id = client.db_user_id
				full_msg.play_mode = !client.isLearning()
				full_msg.value = client.all_adaptations

				let current_UI_state = {};
				for (let key in client.mutations) {
					if (client.all_adaptations[key] && client.all_adaptations[key].includes(client.mutations[key])) {
						current_UI_state[key] = client.mutations[key];
					}
				}
				full_msg.state = {
					"USER": {
						"age": "noObt"
					},
					"ENVIRONMENT": {
						"location": "noObt"
					},
					"PLATFORM": {
						"device": "noObt"
					},
					"UIDESIGN": current_UI_state,
					"REWARD": {
						"MODE": agentType
					}
				}
				full_msg.algorithm = "MCTS"
				// full_msg.algorithm = "QLEARNING"
				ws.send(JSON.stringify(full_msg))
			}
			else if (client && msg_type == 'init_ready') {
				let agent_status = full_msg.value
				console.log("INIT READY:: UPDATE??? : ")
				client.setAgentStatus(agent_status)
				client.log('AGENT', `${full_msg.reward_type} - ${agent_status} for ${client.name}`)
				console.log("client is adapting: ", client.isAdapting())
				if (full_msg.updateStatus == "True" && !client.isAdapting()) {
					console.log("Updating the User.! ASK FOR ADAPT.")
					client.log('ASK-ADAPT', `Client ${client.name} Asked for adaptation.`)

					full_msg.type = "askAdaptation"
					full_msg.user_id = client.socket.sessionID
					full_msg.value = client.all_adaptations

					let current_UI_state = {};
					for (let key in client.mutations) {
						if (client.all_adaptations[key] && client.all_adaptations[key].includes(client.mutations[key])) {
							current_UI_state[key] = client.mutations[key];
						}
					}
					full_msg.state = {
						"USER": {
							"age": "noObt"
						},
						"ENVIRONMENT": {
							"location": "noObt"
						},
						"PLATFORM": {
							"device": "noObt"
						},
						"UIDESIGN": current_UI_state,
						"REWARD": {
							"MODE": agentType
						}
					}
					full_msg.algorithm = "MCTS"
					ws.send(JSON.stringify(full_msg))
					console.log("\n\nTHE USER ASKED FOR ADAPTATION\n")
					client.setAdapting(true)
				}

				if (client.isLearning() || client.isAdapting()) {
					const retryGetImage = () => {
						client.socket.timeout(20000).emit("getImage", (err, response) => {
							if (err) {
								console.log("ERROR... ", err);
								// Retry getImage event after a delay
								// setTimeout(retryGetImage, 1000); // Retry after 1 second
							} else {
								console.log("GOT THE IMAGE!");
								client.log('getImage', `${client.name}`);
								let msg_response = {
									"type": "returnImage",
									"user_id": client.socket.sessionID,
									"value": response
								};
								ws.send(JSON.stringify(msg_response));
							}
						});
					};
					
					retryGetImage();
				}
			}
			else if (client && msg_type == 'adaptation') {
				console.log("received adaptation petition!!")
				let target = full_msg.target
				let value = full_msg.value
				full_msg.user_id = client.socket.sessionID
				client.socket.emit('mutation', target, value)
				client.log('MUTATION', `Send ${target}=>${value} mutations to ${client.name}`)
				const retryGetImage = () => {
					client.socket.timeout(20000).emit("getImage", (err, response) => {
						if (err) {
							console.log("ERROR... ", err);
							// Retry getImage event after a delay
							// setTimeout(retryGetImage, 1000); // Retry after 1 second
						} else {
							console.log("GOT THE IMAGE!");
							client.log('getImage', `${client.name}`);
							let msg_response = {
								"type": "returnImage",
								"user_id": client.socket.sessionID,
								"value": response
							};
							ws.send(JSON.stringify(msg_response));
						}
					});
				};

				console.log("CLIENT LEARNING?? ", client.isLearning());
				console.log("CLIENT ADAPTING?? ", client.isAdapting());
				if (client.isLearning() || client.isAdapting()) {
					// Initial attempt to get the image
					retryGetImage();
				}
				client.setAdapting(false);
			} else if (client && msg_type == 'image') {
				console.log("Image asked!!")
				const retryGetImage = () => {
					client.socket.timeout(20000).emit("getImage", (err, response) => {
						if (err) {
							console.log("ERROR... ", err);
							// Retry getImage event after a delay
							// setTimeout(retryGetImage, 1000); // Retry after 1 second
						} else {
							console.log("GOT THE IMAGE!");
							client.log('getImage', `${client.name}`);
							let msg_response = {
								"type": "returnImage",
								"user_id": client.socket.sessionID,
								"value": response
							};
							ws.send(JSON.stringify(msg_response));
						}
					});
				};

				console.log("CLIENT LEARNING?? ", client.isLearning());
				console.log("CLIENT ADAPTING?? ", client.isAdapting());
				if (client.isLearning() || client.isAdapting()) {
					// Initial attempt to get the image
					retryGetImage();
				}
				client.setAdapting(false);
			}
		});

		ws.on('close', () => {
			console.log(client.name, ' is disconnected from Agent server');
		});

		client.socket.on('sendImage', (imageBuffer) => {

			fs.writeFile(`test_from_proxy.png`, imageBuffer, (err) => {
				if (err) throw err;
			});

			// let sess = socket.sessionID
			// let client = this.clients[sess]
			// //console.log("THIS IS THE CLIENT TO UPDATE: ", client)
			// client.updateState(value)
			console.log("IMAGE SAVED.")
		})


		return ws;
	}

	updateClient(previousClient, newClient) {
		if (previousClient.name != newClient.name) {
			newClient.log('NAME-CHANGE', `${previousClient.name} changed its alias to ${newClient.name}`)
		}
		if (previousClient.finishedTask) {
			newClient.setFinishedTask(1)
		}
		if (previousClient.agentType != "NA") {
			newClient.setLearning(previousClient.isLearning())
			console.log("CLOSING SOCKET")
			previousClient.agentSocket.close()
			console.log("CLOSED SOCKET")
			let agentClientWS = this.createAgentSocket(newClient, previousClient.agentType)
			newClient.setAgentSocket(agentClientWS)
			newClient.setAgentType(previousClient.agentType)
		}
		if (previousClient.page != newClient.page) {
			newClient.log('PAGE-NAV', `Client ${previousClient.name} changed page to: ${newClient.page}`)
		}
		if (previousClient.group != newClient.group) {
			newClient.setGroup(previousClient.group)
		}
		newClient.setAdapting(previousClient.isAdapting())
		newClient.setDB_user_id(previousClient.db_user_id)

		// console.log(newClient)
	}

	createClient(socket) {
		// Check if the User alredy exists.
		let sess = socket.sessionID
		let previousClient = this.clients[sess]
		let newClient = new Client(socket)

		if (previousClient == null) {
			this.clients[socket.sessionID] = newClient
			return newClient
		} else {
			this.updateClient(previousClient, newClient)
			this.clients[socket.sessionID] = newClient
			return newClient
		}

	}

	read_message(message_str) {
		return JSON.parse(message_str);
	}

	// Event handlers for Front->Back group and client action messages
	groupAction(event, action, options) {
		// c.log(action, options)
	}

	clientAction(event, action, options) {
		console.log(options)
		let c = this.getClient(options.clientId)

		if (c && action == "getImage") {
			c.socket.timeout(5000).emit("getImage", (err, response) => {
				if (err) {
					console.log("ERROR... ", err)
					// the other side did not acknowledge the event in the given delay
				} else {
					console.log("GOT THE IMAGE!");
					c.setScreenshot(response)
					let msg_response = {
						"type": "returnImage",
						"user_id": c.socket.sessionID,
						"value": response
					};
					if (c.agentSocket !== null) {
						c.agentSocket.send(JSON.stringify(msg_response));
					}
					// console.log(response); 
				}
			});
			// c.socket.emit("getImage", "test")
		}

		if (c && action == "mutation") {

			let msg_response = {
				"type": "takeAction",
				"user_id": c.socket.sessionID,
				"value": options.mutationValue
			}
			if (c.agentSocket === null) {
				c.socket.emit("mutation", options.mutation, options.mutationValue)
				c.log('MUTATION', `Send ${options.mutation}=>${options.mutationValue} mutations to ${c.name}`)

			} else {
				c.agentSocket.send(JSON.stringify(msg_response))
			}
		}
		if (c && action == "category") {
			console.log("Category pressed.")
			c.socket.emit('mutation', options.category, options.categoryValue)
			c.log('CATEGORY', `Send ${options.category}=>${options.categoryValue} Category to ${c.name}`)
		}
		if (c && action == "agent") {
			if (options.agentValue == "NA") {
				console.log("RANDOMIZE THE UI AND SEND THE REQUIRED MUTATIONS")
				// Create Random UI parameters from the "all_mutations" variable
				console.log(c.all_adaptations)
				for (let attr in c.all_adaptations) {
					let attr_val = c.all_adaptations[attr]
					let random_val = attr_val[Math.floor(Math.random() * attr_val.length)];
					c.socket.emit('mutation', attr, random_val)
					console.log("se ha enviado: ", + attr, +" - " + random_val)
				}
				c.setAgent(null)
				c.setAgentType(options.agentValue)
				c.setAgentStatus("running-" + options.agentValue)
			} else {
				if (options.agentValue == "LEARN") {
					c.setLearning(true)
				} else {
					c.setLearning(false)
				}
				let agentClientWS = this.createAgentSocket(c, options.agentValue)
				c.setAgentSocket(agentClientWS)
				c.setAgentType(options.agentValue)
				c.setAgentStatus("running-" + options.agentValue)
			}
		}
		if (c && action == "location") {
			console.log("Location requested.")
			c.socket.emit('location', options.location, options.locationValue)
			c.log('LOOCATION', `Send ${options.location}=>${options.locationValue} Location to ${c.name}`)
		}
	}

	updateView() {
		this.wc.send('updateClientsView', this.getClients())
	}

	getClients() {
		let groups = {}
		for (let sess in this.clients) {
			let c = this.clients[sess]

			if (!check(groups).has(c.room))
				groups[c.room] = []

			groups[c.room].push({
				id: sess,
				name: c.name,
				group: c.group,
				page: c.page,
				mutations: c.mutations,
				time: c.time
			})
		}
		return groups
	}

	/**
	 * Returns a client searched by sessionID
	 * @param {string} sessionID 
	 * @returns {Client}
	 */
	getClient(sessionID) {
		return this.clients[sessionID] || null
	}

	getClientByID(clientID) {
		var loggedClients = this.clients
		console.log("LOGGEDCLIENT::: ", loggedClients)
		for (var client in loggedClients) {
			console.log("CLIENT::: ", client)
			/* var id = loggedClients[client];
			for(var i=0; i<value.length; i++){
				if(value[i] == clientID) alert("Found '----' in '" + key + "' at index " + i);
			}; */
		}

		return this.clients['logged'].find(client => client.id === clientID);
	}

	deleteClient(sessionID) {
		if (this.clients[sessionID]) {
			this.clients[sessionID].kick()
			delete this.clients[sessionID]
		}
	}

	getNewSessionID() { return crypto.randomUUID() }

	setWebcontents(wc) {
		this.wc = wc
	}
}

module.exports = CommsController