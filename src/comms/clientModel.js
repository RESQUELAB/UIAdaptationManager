const { c, check, array, obj } = require('../check.js')

class Client {

    constructor(socket) {
        this.socket = socket

        this.db_user_id = -1
        this.name = socket.username ? socket.username : 'anonymous'
        this.time = Date.now()
        this.mutations = socket.mutations
        this.all_adaptations = socket.all_mutations
        this.page = socket.page
        this.page = this.page.replace('.html', '')
        this.page = this.page.replace(/.*\/(.*?)/, '$1')
        this.agent = null
        this.learning = false
        this.agentType = "NA"
        this.agentStatus = null
        this.finishedTask = 0
        this.screenshot = null
        this.agentSocket = null
        this.adapting = false
        this.group = 0
        this.session = 0

        this.status = 0;

        if (this.page == '' || this.page == 'index') this.page = 'login'

        if (this.page == 'login') {
            console.log("IN INDEX. NOT-logged")
            this.join('not-logged')
        }
        else {
            console.log("LOGGING.")
            this.join('logged')
        }
    }

    setDB_user_id(db_user_id){
        console.log("seting db_uid to: ", db_user_id)
        this.db_user_id = db_user_id
    }

    setGroup(group){
        console.log("seting group to: ", group)
        this.group = group
    }

    isAdapting() {
        return this.adapting
    }
    setAdapting(adapting) {
        this.adapting = adapting
    }

    setAgentSocket(agentSocket) {
        this.agentSocket = agentSocket
    }

    isLearning() {
        return this.learning
    }

    setLearning(learning) {
        this.learning = learning
    }

    setScreenshot(screenshot) {
        this.screenshot = screenshot
    }

    setFinishedTask(value) {
        this.finishedTask = value
    }

    setAgentStatus(agentStatus) {
        this.agentStatus = agentStatus
    }

    getAgentType() {
        return this.agentType
    }

    setAgentType(agentType) {
        this.agentType = agentType
    }

    updateState(mutations) {
        this.mutations = mutations
    }

    setAgent(agent) {
        this.agent = agent
    }

    join(room) {
        this.room = room
        this.socket.join(room)
    }

    sendMessage(str) {
        this.socket.send(str)
    }

    kick() {
        this.socket.disconnect()
    }

    /**
     * 
     * @param {string} t Message type
     * @param {string} m Message
     */
    log(t, m) {
        let { theme, language, display, font_size, information, category } = this.mutations;
        c.log(`${this.socket.sessionID.substr(0, 8)},${t}, ${this.finishedTask}, ${theme}, ${language}, ${display}, ${font_size}, ${information}, ${category}, ${m}`)
    }
}

module.exports = Client