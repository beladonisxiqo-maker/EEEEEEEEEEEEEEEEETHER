const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

// Ensure a workspace directory exists
const WORKSPACE_DIR = path.join(os.homedir(), '.aether_workspace');
if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#09090b',
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#09090b',
            symbolColor: '#e4e4e7',
            height: 32
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false 
        }
    });

    // In development, load the Vite server. 
    // In production (built), load the index.html file.
    const isDev = !app.isPackaged;
    
    if (isDev) {
        win.loadURL('http://localhost:5173');
        // Open DevTools optionally
        // win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Open external links in browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

app.whenReady().then(() => {
    createWindow();

    // --- IPC HANDLERS ---

    // 1. Execute Script (Python/Node)
    ipcMain.handle('run-script', async (event, { language, code }) => {
        return new Promise((resolve, reject) => {
            const extension = language === 'python' ? 'py' : 'js';
            const command = language === 'python' ? 'python3' : 'node';
            
            const filename = `script_${Date.now()}.${extension}`;
            const filePath = path.join(WORKSPACE_DIR, filename);

            // Write code to temp file
            fs.writeFile(filePath, code, (err) => {
                if (err) return reject(`FS Error: ${err.message}`);

                // Execute
                exec(`${command} "${filePath}"`, { cwd: WORKSPACE_DIR }, (error, stdout, stderr) => {
                    // Cleanup - optional, keeping for debug
                    // fs.unlink(filePath, () => {}); 

                    if (error) {
                        return reject(stderr || error.message);
                    }
                    resolve(stdout || stderr); 
                });
            });
        });
    });

    // 2. System Info
    ipcMain.handle('get-system-info', () => {
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: os.totalmem()
        };
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});