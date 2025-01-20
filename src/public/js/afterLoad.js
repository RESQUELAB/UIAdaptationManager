$('#status .logsFolder').on("click", function () {
    electron.openLogsFolder()
})

$('#status .refresh').on("click", function () {
    electron.refresh()
})

// Request the server info on load
electron.getServerInfo()

// Listen for the server-info event
electron.onServerInfo((event, data) => {
    const { ip, port } = data
    $('#status #serverID').text(`${ip}:${port}`)
})

electron.getLoadMethodsAndDomains()

electron.onLoadMethodsAndDomains((event, data) => {
    const methodsCheckboxes = document.getElementById('methods-checkboxes');
    const domainsCheckboxes = document.getElementById('domains-checkboxes');

    methodsCheckboxes.innerHTML = '';
    domainsCheckboxes.innerHTML = '';

    data.methods.forEach(method => {
        const checkboxHTML = `
            <label>
                <input type="checkbox" class="method-checkbox" value="${method}"> ${method}
            </label>
        `;
        methodsCheckboxes.innerHTML += checkboxHTML;
    });

    data.domains.forEach(domain => {
        const checkboxHTML = `
            <label>
                <input type="checkbox" class="domain-checkbox" value="${domain}"> ${domain}
            </label>
        `;
        domainsCheckboxes.innerHTML += checkboxHTML;
    });
});


const parametersContainer = document.querySelector('.parameters-container');


parametersContainer.addEventListener('change', (event) => {
    if (event.target.matches('.method-checkbox') || event.target.matches('.domain-checkbox') || 
        event.target.matches('#experiment-type') || event.target.matches('#experiment-session')) {
        saveUserSelections();
        computeGroups();
    }
});

document.getElementById('experiment-name').addEventListener('focusout', () => {
    const experimentName = document.getElementById('experiment-name').value;
    if (experimentName) {
        // Load existing data filtered by the experiment name
        electron.getUserSelections(experimentName);
    }
});

function computeGroups() {
    const selectedMethods = Array.from(document.querySelectorAll('#methods-checkboxes .method-checkbox:checked')).map(cb => cb.value);
    const selectedDomains = Array.from(document.querySelectorAll('#domains-checkboxes .domain-checkbox:checked')).map(cb => cb.value);
    
    const numGroups = selectedMethods.length * selectedDomains.length;
    
    // Update the number of groups in the UI
    document.getElementById('num-groups').textContent = numGroups;

    const groupDefinitions = [];

    for (let i = 0; i < numGroups; i++) {
        
        let method1 = selectedMethods[i % selectedMethods.length];
        let domain1 = selectedDomains[i % selectedDomains.length];

        let method2 = selectedMethods[(i + 1) % selectedMethods.length];
        let domain2 = selectedDomains[(i + 1) % selectedDomains.length];

        if (i >= numGroups/2){
            let aux = method1;
            method1 = method2;
            method2 = aux;
            
        }

        groupDefinitions.push({
            group: i + 1, // Group index
            session1: { method: method1, domain: domain1 },
            session2: { method: method2, domain: domain2 }
        });
    }
    electron.setGroupInfo(groupDefinitions)
    // Update the group-definitions table with the new groups
    const tableBody = document.querySelector('#group-definitions tbody');
    tableBody.innerHTML = '';
    
    groupDefinitions.forEach(group => {
        const rowHTML = `
            <tr>
                <td>Group ${group.group}</td>
                <td>${group.session1.method}</td>
                <td>${group.session1.domain}</td>
                <td>${group.session2.method}</td>
                <td>${group.session2.domain}</td>
            </tr>
        `;
        tableBody.innerHTML += rowHTML;
    });
}




function saveUserSelections() {
    const experimentName = document.getElementById('experiment-name').value.trim();
    const experimentType = document.getElementById('experiment-type').value;
    const sessionNumber = document.getElementById('experiment-session').value;

    const methodsCheckboxes = document.querySelectorAll('.method-checkbox:checked');
    const domainsCheckboxes = document.querySelectorAll('.domain-checkbox:checked');

    const selectedMethods = Array.from(methodsCheckboxes).map(checkbox => checkbox.value);
    const selectedDomains = Array.from(domainsCheckboxes).map(checkbox => checkbox.value);
    
    const numGroups = selectedMethods.length * selectedDomains.length;

    const selections = {
        name: experimentName,
        type: experimentType,
        session: sessionNumber,
        selectedMethods,
        selectedDomains,
        totalGroups: numGroups
    };

    electron.sendUserSelections(experimentName, selections);
    console.log('Saved selections:', selections);
}


let experimentName = document.getElementById('experiment-name').value;
electron.getUserSelections(experimentName)

electron.onLoadUserSelections((event, data) => {
    // Populate the UI with the loaded data
    if (data) {
        // Set the experiment type
        document.getElementById('experiment-type').value = data.type || '';

        // Set the session number
        document.getElementById('experiment-session').value = data.session || '';

        // Check the methods
        data.methods.forEach(method => {
            const checkbox = document.querySelector(`.method-checkbox[value="${method}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Check the domains
        data.domains.forEach(domain => {
            const checkbox = document.querySelector(`.domain-checkbox[value="${domain}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    computeGroups()
});

// Request the server info on load
electron.getServerPassword()

// Listen for the server-info event
electron.onServerPassword((event, data) => {
    const password = data
    $('#status #password').text(`${password}`)
})

let startingTime = new Date()
setInterval(function () {
    /** @type {Date} */
    let diff = new Date((new Date()) - startingTime)

    if (diff.getUTCHours() == 0) {
        diff = diff.toUTCString().replace(/.*\d\d:(\d\d:\d\d).*/, '$1')
    }
    else {
        diff = diff.toUTCString().replace(/.*(\d\d:\d\d:\d\d).*/, '$1')
    }
    $('#status #serverUptime').text(diff)
}, 1000)
