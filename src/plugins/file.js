import { event } from '@tauri-apps/api'
import { getCurrent, getAll, CloseRequestedEvent } from "@tauri-apps/api/window";
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { ask, open, save, message } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { v3 as murmurhash } from 'murmurhash'

function uniqueWindowLabel(prefix = 'window') {
  for(let i = 0;;i++) {
    let label = `${prefix}${i}`
    let found = false
    for(let win of getAll()) {
      if (win.label == label) {
        found = true
        break
      }
    }
    if (!found) return label
  }
}

const filters = [
  {
    name: 'HTML file',
    extensions: ['htm', 'html']
  },
  {
    name: 'All files',
    extensions: []
  },
]

const newFile = {
  icon: 'file',
  tooltip: "New Document",
  async exec(editor) {
    const { file } = editor.__plugins
    file.new(editor)
  }
}

const openFile = {
  icon: 'folder',
  tooltip: "Open Document",
  async exec(editor) {
    const { file } = editor.__plugins
    file.open(editor)
  }
}

const saveFile = {
  icon: 'save',
  tooltip: "Save Document",
  list: {
    saveas:   "Save As...",
    savecopy: "Save a Copy..."
  },
  
  async exec(editor, _, { control }) {
    const { file } = editor.__plugins
    if (control?.name == 'saveas') {
      file.saveAs(editor)
    } else if (control?.name == 'savecopy') {
      file.saveAs(editor, true)
    } else {
      file.save(editor)
    }
  }
}

const saveFileAs = {
  icon: 'save',
  tooltip: "Save Document",
  async exec(editor) {
    const { file } = editor.__plugins
    file.saveAs(editor)
  }
}

class File {
  buttons = [
    {
      name: "newFile",
      group: "file"
    },
    {
      name: "openFile",
      group: "file"
    },
    {
      name: "saveFile",
      group: "file"
    }
  ]

  init(editor) {
    const win = getCurrent()
    this.unlisten = win.listen("tauri://close-requested", async (e) => {
      const ev = new CloseRequestedEvent(event)
      if (this.isDirty(editor)) {
        ev.preventDefault()
        const close = await confirm('Your document is not saved, are you sure you want to close it?', {
          title:       'Close without saving?',
          kind:        'warning',
          okLabel:     'Yes, discard current document',
          cancelLabel: 'No, keep document opened'})
        if (close) {
          win.destroy()
        }
      } else {
        win.destroy()
      }
    })

    window.addEventListener("beforeunload", (e) => {
      let confirmationMessage = 'Your document is not saved, are you sure you want to discard it?'

      if (this.isDirty(editor)) {
        e.returnValue = confirmationMessage
        return confirmationMessage
      }
    });

    if (window.location.hash == '#open') {
      window.location.hash = ''
      this.forceopen(editor)
    } else {
      this.setNoDirty(editor)
    }

    editor.events.on('change', (e) => {
      console.log('change', e)
    });
  }

  destruct() {
    if (this.unlisten) this.unlisten.then(f => {if (f) f()})
  }

  isDirty(editor) {
    const value = editor.getNativeEditorValue()
    const hash  = murmurhash(value)
    console.log('last', this.currentHash, this.lastValue)
    console.log('curr', hash, value)
    let dirty = hash != this.currentHash
    return dirty
  }

  setNoDirty(editor, val = undefined){
    setTimeout(() => {
      const value = editor.getNativeEditorValue()
      this.currentHash = murmurhash(value)
      this.lastValue = value
      console.log('not dirty')
      // TODO: when the editor gains focus the first time, it triggers a change
    }, 100)
  }

  async new(editor, open = false) {
    /*if(!this.isDirty(editor) || await ask('Clear entire document?')) {
      this.currentPath = null
      editor.value = ''
      this.setNoDirty(editor, '')
    }
    return*/

    const webview = new WebviewWindow(uniqueWindowLabel(), {
      url: 'index.html' + (open ? '#open' : '')
    });
    //webview.once('tauri://created', function () {
    //  webview.show()
    //})
    webview.once('tauri://error', function (e) {
      message(e.payload, {
        title: 'Could not create a new document',
        kind: 'error'
      })
    });
  }

  async open(editor) {
    if (this.currentPath || this.isDirty(editor)) {
      return await this.new(editor, true)
    } else {
      return await this.forceopen(editor)
    }
  }

  async forceopen(editor) {
    const file = await open({ multiple: false, filters });

    if (Array.isArray(file) || file === null) {
      return
    }

    const path = file.path
    if (path == null) return

    const html = await readTextFile(path)
    if (html == null) return

    this.setCurrentPath(path)
    editor.value = html
    this.setNoDirty(editor, html)
  }

  async save(editor) {
    if (!this.currentPath) return await this.saveAs(editor)

    if (!this.isDirty(editor)) {
      message("File content is identical as last opened or saved", {
        title: 'Nothing to save',
        kind: 'error'
      })
    }

    try {
      const value = editor.value
      writeTextFile(this.currentPath, editor.value)
      this.setNoDirty(editor, value)
    } catch (e) {
      message(e.message, {
        title: 'Could not save',
        kind: 'error'
      })
    }
  }

  async saveAs(editor, copy = false) {
    for(;;){
      let savePath = await save({ filters })
      if (savePath == null) return

      if (!savePath.match(/\.html?/i)) {
        message('Please append the .html extention to the file name', {
          title: 'Invalid filename',
          kind: 'error'
        })
        continue
      }

      const value = editor.value
      writeTextFile(savePath, value)
      if (!copy) {
        this.setCurrentPath(savePath)
        this.setNoDirty(editor, value)
      }
      break
    }
  }

  setCurrentPath(path) {
    this.currentPath = path
    getCurrent().setTitle(`${path.match(/[^\/]*$/)[0]} - WebDocs - ${path.match(/^(.*)\/[^\/]*$/)[1]}`)
  }
}

export default function(Jodit) {
  Jodit.defaultOptions.controls.newFile = newFile
  Jodit.defaultOptions.controls.openFile = openFile
  Jodit.defaultOptions.controls.saveFile = saveFile

  Jodit.plugins.add('file', File);
}
