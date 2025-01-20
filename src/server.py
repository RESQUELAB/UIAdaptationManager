from websocket_server import WebsocketServer
import gym
from ui_adapt.envs.uiadaptationenv import UIAdaptationEnv

import json

## Global vars
agents = {}
envs = {}
configs = {}
users = {}

# Called for every client connecting (after handshake)
def new_client(client, server):
    print("New client connected and was given id %d" % client['id'])
    print(f"now this is our client list: {server.clients}")
    message_init = {
        "type": "init",
        "value": ""
        }
    message_init_string = json.dumps(message_init)
    server.send_message(client, message_init_string)


# Called for every client disconnecting
def client_left(client, server):
    print("Client(%d) disconnected" % client['id'])
    # if agents[client["id"]]:
    #     del agents[client["id"]]
    # if envs[client["id"]]:
    #     del envs[client["id"]]
    print("Agent for Client(%d) stopped and Environment deleted" % client['id'])



# Called when a client sends a message
def message_received(client, server, message):
    json_message = json.loads(message)
    if "type" in json_message and json_message["type"] == "init_response":
        print("JSON MESSAGE:::::: ", json_message)
        return_message = {
            "type": "init_ready",
            "value": "Agent created with " + str(
                json_message["algorithm"]) + " algorithm",
            "algorithm": json_message["algorithm"],
            "reward_type": json_message["state"]["REWARD"]["MODE"],
            "updateStatus": "False"
        }

        if "user_id" in json_message and json_message["user_id"] in users:
            envs[users[json_message["user_id"]]].updateSockets(client, server)
            return_message["updateStatus"] = "True"
        else:
            initial_state = json_message["state"]
            config = createConfigJSON(json_message, client)
            configs[client["id"]] = config
            env = createEnv(client, config, initial_state, client, server)
            agent = createAgent(env, client, json_message["algorithm"], config=config, initial_state=initial_state)

            print(f"Agent created for Client {client['id']}.\nAgent list: {agents}.\nEnvironments List: {envs}")
            users[json_message["user_id"]] = client['id']
            print("POST ENV3")
            print(envs[users[json_message["user_id"]]].reward_predictor.mode)
            
        return_message_string = json.dumps(return_message)
        server.send_message(client, return_message_string)
    elif "type" in json_message and json_message["type"] == "returnImage":
        uid = users[json_message["user_id"]]
        envs[uid].getImage(json_message["value"])
    elif "type" in json_message and json_message["type"] == "askAdaptation":
        initial_state = json_message["state"]
        config = createConfigJSON(json_message, client)
        uid = users[json_message["user_id"]]
        agents[uid].adapt(config=config,initial_state=initial_state, env=envs[uid])
        # envs[uid].getImage(json_message["value"])
    elif "type" in json_message and json_message["type"] == "takeAction":
        action_id_number = -1
        uid = users[json_message["user_id"]]

        for action_id, action_data in configs[uid]["ACTIONS"].items():
            if action_id == "MODE":
                continue
            if action_data["value"] == json_message["value"]:
                # Print the corresponding action ID
                print("Action ID for", json_message["value"] + ":", action_id)
                action_id_number = action_id
                break
        else:
            print("Action", json_message["value"], "not found in config.")
        uid = users[json_message["user_id"]]
        envs[uid].step(int(action_id_number))
    else:
        print("Client(%d) said: %s" % (client['id'], message))

def createAgent(env, client, algorithm="QLEARNING", config=None, initial_state=None):
    if algorithm == "QLEARNING":
        from ui_adapt.RL_algorithms import QLearningAgent as RLAgent
        file_path = 'rl_models/qtable.pickle'
        SIGMA = 1
        agent = RLAgent(env, QTABLE_PATH=file_path, SIGMA=SIGMA)
    elif algorithm == "MCTS":
        from ui_adapt.RL_algorithms import MCTS as RLAgent
        GAME_NAME = 'UIAdaptation-v0'
        agent = RLAgent(GAME_NAME, 5, c=1, mode=config["REWARD"]["MODE"])
    agents[client["id"]] = agent
    '''
        Hacer el agente sin tener qtable. No hace falta pq luego
        Usaremos MCTS. 

        Usar solo la I de la formula, la G usa modelos y hay que
        reentrenarlos.

        Por ahora, lanzar todos los agentes aqui.
        Más adelante ver cómo lanzarlos con multiprocessing.
        
    '''
    return agent

def createEnv(client, config, initial_state, client_socket, server_socket):
    env = UIAdaptationEnv(config_data=config, 
                          initialState=initial_state,
                          ws_client=client_socket,
                          ws_server=server_socket)
    
    envs[client["id"]] = env
    return env

def createConfigJSON(config_info, client):
    config = {}
    createContext(config)
    createUIDesign(config, config_info["value"])
    # config["UIDESIGN"] = config_info["value"]
    createActions(config)
    if "REWARD" in config_info["state"]:
        createReward(config, config_info["state"]["REWARD"])
    createAPIConnection(config, client)
    # print("this is the config: ", config)
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=4)
    return config

def createUIDesign(config, ui_description):
    config["UIDESIGN"] = {}
    for factor in ui_description:
        config["UIDESIGN"][factor.upper()] = ui_description[factor]
    return config

def createReward(config, config_info):
    config["REWARD"] = {
        "MODE": config_info["MODE"]
    }

def createActions(config):
    config["ACTIONS"] = {}
    config["ACTIONS"]["MODE"] = "WEBSOCKET"
    action = 0
    config["ACTIONS"][str(action)] = {
        "name": "No operate",
        "target": "pass",
        "value": "pass",
        "api_call": "pass"
        }
    action += 1
    all_adaptations = config["UIDESIGN"]
    for factor in all_adaptations:
        for val in all_adaptations[factor]:
            config["ACTIONS"][str(action)] = {
                "name": "Change to " + str(val).lower(),
                "target": str(factor).lower(),
                "value": str(val).lower(),
                "api_call": "adaptation " + str(factor).lower()  + " " + str(val).lower()
            }
            action += 1

    return config

def createAPIConnection(config, client):
    config["API_CONNECTION"] = {
        "HOST": client['address'][0],
        "PORT": client['address'][1],
        "RESOURCES": "",
        "RENDER_RESOURCE": ""
    }

def createContext(config):
    config["USER"] = {
        "AGE": ["noObt"]
    }
    config["PLATFORM"] = {
        "DEVICE": ["noObt"]
    }
    config["ENVIRONMENT"] = {
        "LOCATION": ["noObt"]
    }
    return config
    

PORT=9998
HOST="127.0.0.1"
server = WebsocketServer(host = HOST, port = PORT)
server.set_fn_new_client(new_client)
server.set_fn_client_left(client_left)
server.set_fn_message_received(message_received)
print(F"Server running on {HOST}:{PORT}")
server.run_forever()