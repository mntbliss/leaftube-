# Preload scripts

-   **preload.cjs** – main window & settings window
-   **youtubeBarPreload.cjs** – YouTube bar BrowserView

Each file inlines `IpcChannel` names (Electron preload sandbox cant `require` relative paths for some reason and \_\_dirname doesnt exist there, as well as `node:path` idk this is so cringe ikr). When you add or change channels in `../constants/ipc-channels.js`, update the inlined object in the preloads that use them pls!

TODO: if u know how to fix it dm me cause im down to listen tho
