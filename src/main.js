// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const fs = require('fs')
const path = require('path')
const CommsController = require('./comms/commsController.js')

let wc = null;
const dataFilePath = path.join(__dirname, 'methods-domains.json');
const selectionsFilePath = path.join(__dirname, 'selections.json');

// Load methods and domains from the file
function loadMethodsAndDomains() {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        if (data.trim()) {
            try {
                return JSON.parse(data);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                return { methods: [], domains: [] }; 
            }
        }
    }
    return { methods: [], domains: [] };
}

// Load user selections based on experiment name
function loadSelections(experimentName) {
    if (fs.existsSync(selectionsFilePath) && fs.statSync(selectionsFilePath).size > 0) {
        const data = fs.readFileSync(selectionsFilePath, 'utf8');
        // Check if the data is non-empty
        if (data.trim()) {
            try {
                const allSelections = JSON.parse(data);
                return allSelections[experimentName] || null; // Return null if no selections found for the name
            } catch (err) {
                console.error('Error parsing selections file:', err);
                return null; // Return null on error
            }
        }
    }
    return null; // Return null if the file doesn't exist or is empty
}



// Save user selections to the file
function saveSelections(experimentName, selections) {
    let allSelections = {};
    // Check if the file exists and is not empty
    if (fs.existsSync(selectionsFilePath) && fs.statSync(selectionsFilePath).size > 0) {
        const data = fs.readFileSync(selectionsFilePath, 'utf8');
        try {
            allSelections = JSON.parse(data);
        } catch (err) {
            console.error('Error parsing selections file:', err);
        }
    }
	console.log("---------")
	console.log(selections)
	console.log("---------")
    // Update or create the entry for the specific experiment name
    allSelections[experimentName] = {
		"name": selections.name,
        "type": selections.type,
        "session": selections.session,
        "methods": selections.selectedMethods,
        "domains": selections.selectedDomains,
		"totalGroups": selections.totalGroups
    };

    // Write the updated selections back to the file
    fs.writeFileSync(selectionsFilePath, JSON.stringify(allSelections, null, 2));
}



function createWindow() {
	// Browser window
	const mainWindow = new BrowserWindow({
		width: 960,
		height: 640,
		minWidth: 960,
		minHeight: 640,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
		}
	})
	wc = mainWindow.webContents

	// Link emulating on electron
	ipcMain.on('loadPage', (event, p) => {
		mainWindow.loadFile('public/' + p);
	})

	// Load the index.html of the app
	mainWindow.loadFile('public/index.html')

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()
}

const comms = new CommsController()
app.whenReady().then(() => {
    // Send methods, domains, and user selections to the renderer when requested
    ipcMain.on('getMethodsAndDomains', (event) => {
		const methodsAndDomains = loadMethodsAndDomains();
        event.sender.send('methods-and-domains', methodsAndDomains);
    });

	
	ipcMain.on('setGroupDefinitions', (event, groupDefinitions) => {
		comms.setGroupDefinitions(groupDefinitions)
	});

    ipcMain.on('getUserSelections', (event, experimentName) => {
		const userSelections = loadSelections(experimentName);
		event.sender.send('user-selections', userSelections);
		comms.setParameters(userSelections)
	});
	
	ipcMain.on('saveUserSelections', (event, experimentName, selections) => {
		saveSelections(experimentName, selections);
		comms.setParameters(selections)
	});
	
	// Renderer's event handlers.
	ipcMain.on('groupAction', (event, action, options) => { comms.groupAction(event, action, options) })
	ipcMain.on('clientAction', (event, action, options) => { comms.clientAction(event, action, options) })
	ipcMain.on('openLogsFolder', (event) => {
		const logsPath = path.join(process.cwd(), 'logs')

		// Check if the logs folder exists, create it if it doesn't
		if (!fs.existsSync(logsPath)) {
			fs.mkdirSync(logsPath, { recursive: true })
		}

		// Open the logs folder
		shell.openPath(logsPath)
	})
	ipcMain.on('refresh', (event) => { comms.updateView() })

	ipcMain.on('getServerInfo', (event) => {
		// Send the server IP and port to the renderer process
		const serverInfo = comms.getServerInfo()
		event.sender.send('server-info', serverInfo)
	})

	ipcMain.on('getServerPassword', (event) => {
		// Send the server IP and port to the renderer process
		const serverPassword = comms.getServerPassword()
		event.sender.send('server-password', serverPassword)
	})

	createWindow()
	comms.setWebcontents(wc)

	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	app.on('activate', function () {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

// Quit when all windows are closed, except on macOS.
// There, it's common to stay active until the user quits explicitly with Cmd + Q.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit()
})