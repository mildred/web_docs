import { execSync } from 'child_process'
import { copyFileSync } from 'fs'


let triple = execSync('rustc --version --verbose')
  .toString()
  .split(/\r?\n/)
  .map(line => {
    let m = /^host: (.*)$/.exec(line)
    if (m) {
      return m[1]
    } else {
      return null
    }
  })
  .find(x => x)

let ext = process.execPath.endsWith('.exe') ? '.exe' : ''
let dest = `src-tauri/bin/node-${triple}${ext}`
console.log("Copy %s to %s [%o]", process.execPath, dest, {platform: process.platform, arch: process.arch})
copyFileSync(process.execPath, dest)

