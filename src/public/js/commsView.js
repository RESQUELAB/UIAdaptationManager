
class ClientGroup {
    constructor(name) {
        this.name = name
        this.clients = []
        this.createView()
    }

    createView() {

        let groupHeader = $(
            `
            <h3 id="client-group-${this.name}-title">${this.name} group </h3>
            <table id="client-group-${this.name}" class="client-group">
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Name</th>
                        <th>Group</th>
                        <th>Page</th>
                        <th>Mutations</th>
                        <th>Time</th>
                        <th>Actions</th>
                        <th>Category</th>
                        <th>Agent</th>
                    </tr>
                </thead>
                <tbody class="clients-list">
                    <!-- Client rows will be inserted here -->
                </tbody>
            </table>
            `)
        $('#clients').append(groupHeader)

        $('.mutationButton', groupHeader).on('click', function () {
            let e = $(this)
            let mutationName = e.attr('mutation-name')
            let mutationValue = e.attr('mutation-value')

            // For each input:checked on the .clients-list next to this #client-group
            $('.clients-list input:checked', groupHeader).each(function () {
                // id is the name attr of the checkbox minus first 9 chars
                electron.sendClientAction("mutation", {
                    clientId: $(this).attr('name').substr(9),
                    mutation: mutationName,
                    mutationValue: mutationValue
                })
            })
        })

        $('.showActions', groupHeader).on('click', function () {
            let e = $(this)
            let p = e.parent()

            // expanded -> closed
            if (p.hasClass('expanded')) {
                e.text('+ actions')
                p.removeClass('expanded')
            }
            // closed -> expanded
            else {
                e.text('- actions')
                p.addClass('expanded')
            }
        })

        let that = this
        $('.selected-clients input[type=checkbox]', groupHeader).on('click', function () {
            let e = $(this)

            // input.checked is updated before this event call
            // Select all
            if (!e[0].checked) {
                $('.clients-list input:checked', groupHeader).each(function () {
                    this.checked = false
                })
                that.updateSelectedCount()
            }
            // Select none
            else {
                $('.clients-list input:not(:checked)', groupHeader).each(function () {
                    this.checked = true
                })
                that.updateSelectedCount()
            }
        })

        this.clientQuantity = $('.clientQuantity', groupHeader)
        this.list = $(`#client-group-${this.name} .clients-list`);
        // this.list = $('.clients-list', groupHeader)
        this.selected = $('.selected-clients', groupHeader)
    }

    /**
     * Updates the group's html
     * @param {{id: string, name: string, page: string,
     * mutations: {}, time: number}[]} clientList  
     */
    updateView(clientList) {
        this.clients = [];
        // this.list.empty(); // Clear the list

        for (let c of clientList) {
            this.clients.push(c);
            this.list.append(this.getClientHtml(c));
        }
        this.setupListeners();
        this.updateCount();
    }

    /**
     * 
     * @param {{id: string, name: string, page: string,
     * mutations: string, time: number}} client
     */
    getClientHtml(client) {
        console.log(client)
        let html = `
            <tr client-id="${client.id}">
                <td><input type="checkbox" name="selected-${client.id}"/></td>
                <td>${client.name}</td>
                <td>${client.group}</td>
                <td>${client.page}</td>
                <td>${this.objToKV(client.mutations)}</td>
                <td>${new Date(client.time).toLocaleTimeString()}</td>
                <td>
                    <div class="actionsArea">
                        <button class="showActions">+ actions</button>
                        <div class="collapsable">- actions -</div>
                        <div class="collapsable">AskForImage</div>
                        <button class="collapsable getImageButton" title="Ask for SS">getImage</button>
                        <div class="collapsable">Theme</div>
                        <button class="collapsable mutationButton" mutation-name="theme" mutation-value="light" title="Set Light Theme">Light</button>
                        <button class="collapsable mutationButton" mutation-name="theme" mutation-value="dark" title="Set Dark Theme">Dark</button>
                        <div class="collapsable header">Display</div>
                        <button class="collapsable mutationButton" mutation-name="display" mutation-value="list" title="Set layout to list">List</button>
                        <button class="collapsable mutationButton" mutation-name="display" mutation-value="grid2" title="Set layout to grid2">Grid 2</button>
                        <button class="collapsable mutationButton" mutation-name="display" mutation-value="grid3" title="Set layout to grid3">Grid 3</button>
                        <button class="collapsable mutationButton" mutation-name="display" mutation-value="grid4" title="Set layout to grid4">Grid 4</button>
                        <button class="collapsable mutationButton" mutation-name="display" mutation-value="grid5" title="Set layout to grid5">Grid 5</button>
                        <div class="collapsable header">Font Size</div>
                        <button class="collapsable mutationButton" mutation-name="font_size" mutation-value="small" title="Set Font size to small">Small</button>
                        <button class="collapsable mutationButton" mutation-name="font_size" mutation-value="default" title="Set Font size to default">Default</button>
                        <button class="collapsable mutationButton" mutation-name="font_size" mutation-value="big" title="Set Font size to big">Big</button>
                        <div class="collapsable header">Information</div>
                        <button class="collapsable mutationButton" mutation-name="information" mutation-value="show" title="Set Information to show">Show</button>
                        <button class="collapsable mutationButton" mutation-name="information" mutation-value="partial" title="Set Information to partial">Partial</button>
                        <button class="collapsable mutationButton" mutation-name="information" mutation-value="hide" title="Set Information to hide">Hide</button>
                    </div>
                </td>
                <td>
                    <div class="categoryArea">
                        <button class="categoryButton" category-name="category" category-value="sports" title="Adaptive-Sports">Sports</button>
                        <button class="categoryButton" category-name="category" category-value="trips" title="Adaptive-Trips">Trips</button>
                        <button class="categoryButton" category-name="category" category-value="courses" title="Adaptive-Courses">Courses</button>
                    </div>
                </td>
                <td>
                    <div class="agentArea">
                        <button class="agentButton" agent-name="agent" agent-value="NA" title="NA">NA</button>
                        <button class="agentButton" mutation-name="agent" agent-value="HCI" title="HCI">HCI</button>
                        <button class="agentButton" agent-name="agent" agent-value="HCIHF_old" title="HCIHF_old">HCIHF_old</button>
                        <button class="agentButton" agent-name="agent" agent-value="HCIHF" title="HCIHF">HCIHF</button>
                        <button class="agentButton" agent-name="agent" agent-value="LEARN" title="LEARN">LEARN</button>
                    </div>
                </td>
            </tr>
        `;
        return html;
    }

    objToKV(json) {
        let list = []
        for (let k in json) {
            list.push(`
                <div class="key-value-item">
                    <span class="key">${k}:</span>
                    <span class="value">${json[k]}</span>
                </div>
            `);
        }
        return `<div class="key-value-container">${list.join('')}</div>`; // Wrap everything in the container
    }
    


    setupListeners() {

        $("#refresh").on("click", function () {
            this.updateView(this.clients)
        });

        $('.showActions', this.list).on('click', function () {
            let e = $(this)
            let p = e.parent()

            // expanded -> closed
            if (p.hasClass('expanded')) {
                e.text('+ actions')
                p.removeClass('expanded')
            }
            // closed -> expanded
            else {
                e.text('- actions')
                p.addClass('expanded')
            }
        })

        $('.mutationButton', this.list).on('click', function () {
            let e = $(this)
            let id = e.parent().parent().parent().attr('client-id')

            electron.sendClientAction("mutation", {
                clientId: id,
                mutation: e.attr('mutation-name'),
                mutationValue: e.attr('mutation-value')
            })
        })

        $('.categoryButton', this.list).on('click', function () {
            let e = $(this)
            let id = e.parent().parent().parent().attr('client-id')

            electron.sendClientAction("category", {
                clientId: id,
                category: e.attr('category-name'),
                categoryValue: e.attr('category-value')
            })
        })

        $('.agentButton', this.list).on('click', function () {
            let e = $(this)
            let id = e.parent().parent().parent().attr('client-id')

            electron.sendClientAction("agent", {
                clientId: id,
                agent: e.attr('agent-name'),
                agentValue: e.attr('agent-value')
            })
        })

        $('.getImageButton', this.list).on('click', function () {
            let e = $(this)
            let id = e.parent().parent().parent().attr('client-id')

            electron.sendClientAction("getImage", {
                clientId: id
            })
        })

        let that = this
        $('input[type=checkbox]', this.list).on('click', function () {
            that.updateSelectedCount()
            $('.selected-clients input')[0].checked = false
        })
    }

    updateSelectedCount() {
        let n = $('input:checked', this.list).length
        $('.selected-number', this.selected).text(n)
    }

    updateCount() {
        this.clientQuantity.text(this.length())
    }

    deleteView() {
        $(`#clients #client-group-${this.name}-title`).remove()
        $(`#clients #client-group-${this.name}`).remove()
    }

    length() {
        return this.clients.length
    }

}


class GroupManager {
    constructor() {
        this.groups = []

        // Add a listener to update Clients View
        window.electron.updateClientsView((event, value) => {
            console.log("UPDATE CLIENTS VIEW FROM GROUP MANAGER CALLED. ", value)
            // Delete all groups and replace with the input
            for (let gr of this.groups){
                gr.deleteView()
            }
            this.groups = []
            
            const groupOrder = ["logged", "not-logged"];
            const processedGroups = new Set();

            // First process the known groups in the defined order
            for (let group of groupOrder) {
                if (value[group]) {
                    console.log(`Processing ${group} group`);
                    this.addGroup(group);
                    this.getGroup(group).updateView(value[group]);
                    processedGroups.add(group);  // Mark this group as processed
                }
            }

            // Now process any other unknown groups
            for (let group in value) {
                if (!processedGroups.has(group)) {  // Only process groups not in the known list
                    console.log(`Processing unknown group: ${group}`);
                    this.addGroup(group);
                    this.getGroup(group).updateView(value[group]);
                }
            }

            this.updateCount();

        })
    }

    getGroup(name) {
        for (let g of this.groups) {
            if (g.name === name) return g
        }
        return null
    }

    addGroup(name) {
        this.groups.push(new ClientGroup(name))
    }

    updateCount() {
        $('#status #clientsQuantity').text(this.length())
        this.updateGroupCounts()
    }

    length() {
        let n = 0
        for (let g of this.groups) n += g.length()
        return n
    }
    updateGroupCounts() {
        let groupCounts = this.getGroupCounts(); // Call the helper function to get the counts
        $('#status #groupCounts').text(groupCounts); // Assuming you have an element to display the result
    }
    
    getGroupCounts() {
        return this.groups.map(group => {
            return `${group.length()}: ${group.name}`;
        }).join(", ");
    }
    
}

var gm = new GroupManager()


