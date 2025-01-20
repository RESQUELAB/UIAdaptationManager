all_adaptations =  {'display': ['list', 'grid2', 'grid3', 'grid4', 'grid5'], 'theme': ['light', 'dark'], 'information': ['show', 'partial', 'hide'], 'font_size': ['small', 'default', 'big']}

config = {}
config["ACTIONS"] = {}
config["ACTIONS"]["MODE"] = "API"
action = 0
config["ACTIONS"][str(action)] = {
    "name": "No operate",
    "target": "pass",
    "value": "pass",
    "api_call": "pass"
    }
action += 1

for factor in all_adaptations:
    print(factor)
    for val in all_adaptations[factor]:
        print(action, " - ", val)
        config["ACTIONS"][str(action)] = {
            "name": "Change to " + str(val),
            "target": str(factor),
            "value": str(val),
            "api_call": "adapt " + str(factor)  + " " + str(val)
        }
        action += 1

print(config)
