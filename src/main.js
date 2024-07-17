import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask } from '@tauri-apps/plugin-dialog';

async function check_and_install_updates(){
  const update = await check();
  if (update?.available && await ask(`Do you want to install the update?`, {
      title: `Update ${update.manifest?.version} is available`
    })) {
    console.log(`Update to ${update.version} available! Date: ${update.date}`);
    console.log(`Release notes: ${update.body}`);
    await update.downloadAndInstall();
    // requires the `process` plugin
    await relaunch();
  }
}

check_and_install_updates()

ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(App, {}, null));


