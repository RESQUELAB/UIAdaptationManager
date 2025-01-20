const { contextBridge, ipcRenderer, shell } = require('electron')

// window.electron.(...)
contextBridge.exposeInMainWorld('electron', {
    sendGroupAction: (action, options) =>
        ipcRenderer.send('groupAction', action, options),

    sendClientAction: (action, options) =>
        ipcRenderer.send('clientAction', action, options),

    updateClientsView: (callback) =>
        ipcRenderer.on('updateClientsView', callback),

    openLogsFolder: () =>
        ipcRenderer.send('openLogsFolder'),

    refresh: () =>
        ipcRenderer.send('refresh'),

    getServerInfo: () => ipcRenderer.send('getServerInfo'),
    onServerInfo: (callback) => ipcRenderer.on('server-info', callback),
    getServerPassword: () => ipcRenderer.send('getServerPassword'),
    onServerPassword: (callback) => ipcRenderer.on('server-password', callback),
    getLoadMethodsAndDomains: () => ipcRenderer.send('getMethodsAndDomains'),
    onLoadMethodsAndDomains: (callback) => ipcRenderer.on('methods-and-domains', callback),
    getUserSelections: (experimentName) => ipcRenderer.send('getUserSelections', experimentName),
    onLoadUserSelections: (callback) => ipcRenderer.on('user-selections', callback),
    sendUserSelections: (experimentName, selections) => ipcRenderer.send('saveUserSelections', experimentName, selections),
    
    setGroupInfo: (groupDefinitions) => ipcRenderer.send('setGroupDefinitions', groupDefinitions),
})