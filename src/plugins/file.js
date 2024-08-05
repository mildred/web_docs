import { event } from '@tauri-apps/api'
import { getCurrentWindow, getAllWindows, CloseRequestedEvent } from "@tauri-apps/api/window";
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { ask, open, save, message } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { v3 as murmurhash } from 'murmurhash'

function uniqueWindowLabel(prefix = 'window') {
  for(let i = 0;;i++) {
    let label = `${prefix}${i}`
    let found = false
    for(let win of getAllWindows()) {
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
    const win = getCurrentWindow()
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
      setTimeout(() => {
        this.setNoDirty(editor)
      }, 100)
    }

    editor.events.on('change', (e) => {
      console.log('change', e)
      this.updateTitle(editor)
    });

    //this.stop_interval_update_title = setInterval(() => {
    //  this.updateTitle(editor)
    //}, 1000)
  }

  destruct() {
    if (this.unlisten) this.unlisten.then(f => {if (f) f()})
    if (this.stop_interval_update_title) this.stop_interval_update_title()
  }

  isDirty(editor) {
    const value = editor.getNativeEditorValue()
    const hash  = murmurhash(value)
    //console.log('last', this.currentHash, this.lastValue)
    //console.log('curr', hash, value)
    let dirty = hash != this.currentHash
    return dirty
  }

  setNoDirty(editor){
    //setTimeout(() => {
    const value = editor.getNativeEditorValue()
    this.currentHash = murmurhash(value)
    this.lastValue = value
    console.log('not dirty')
    this.updateTitle(editor)
    // TODO: when the editor gains focus the first time, it triggers a change
    //}, 100)
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

    this.setCurrentPath(editor, path)

    // Normalize HTML
    //let template = document.createElement('template')
    //template.innerHTML = html
    //html = template.innerHTML

    editor.value = html
    this.setNoDirty(editor)
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
      const value = this.getMarkupForSave(editor)
      console.log('writeTextFile', value)
      writeTextFile(this.currentPath, value)
      this.setNoDirty(editor)
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

      const value = this.getMarkupForSave(editor)
      writeTextFile(savePath, value)
      if (!copy) {
        this.setCurrentPath(editor, savePath)
        this.setNoDirty(editor)
      }
      break
    }
  }

  getMarkupForSave(editor) {
    //let old_value = editor.value

    //editor.iframe.contentDocument.documentElement.classList.toggle('jodit-wysiwyg_iframe', false)
    //editor.iframe.contentDocument.body.removeAttribute('contenteditable')

    let value = editor.getNativeEditorValue()
    //editor.value = old_value

    // Cleanup HTML
    let doc = new DOMParser().parseFromString(value, 'text/html')
    doc.documentElement.classList.toggle('jodit-wysiwyg_iframe', false)
    if (doc.documentElement.getAttribute('class') === '') doc.documentElement.removeAttribute('class')
    doc.body.removeAttribute('contenteditable')
    doc.body.removeAttribute('spellcheck')
    doc.body.style.minHeight = null
    if (doc.body.getAttribute('style') === '') doc.body.removeAttribute('style')
    //let res = new XMLSerializer().serializeToString(doc);
    let res = new XMLSerializer().serializeToString(doc.doctype) + doc.documentElement.outerHTML

    //let res = this.clearMarkers(value)

    console.log('getMarkupForSave()', res)
    return res

    //return value
  }

  /*
  clearMarkers(html) {
    const bodyReg = /<body.*<\/body>/im,
      bodyMarker = '{%%BODY%%}',
      body = bodyReg.exec(html);

    if (body) {
      // remove markers
      html = html
        .replace(bodyReg, bodyMarker)
        .replace(/<span([^>]*?)>(.*?)<\/span>/gim, '')
        .replace(
          /&lt;span([^&]*?)&gt;(.*?)&lt;\/span&gt;/gim,
          ''
        )
        .replace(
          bodyMarker,

          body[0]
          .replace(
            /(<body[^>]+?)min-height["'\s]*:[\s"']*[0-9]+(px|%)/im,
            '$1'
          )
          .replace(
            /(<body[^>]+?)([\s]*["'])?contenteditable["'\s]*=[\s"']*true["']?/im,
            '$1'
          )
          .replace(
            /<(style|script|span)[^>]+jodit[^>]+>.*?<\/\1>/g,
            ''
          )
        )
        .replace(
          /(class\s*=\s*)(['"])([^"']*)(jodit-wysiwyg|jodit)([^"']*\2)/g,
          '$1$2$3$5'
        )
        .replace(/(<[^<]+?)\sclass="[\s]*"/gim, '$1')
        .replace(/(<[^<]+?)\sstyle="[\s;]*"/gim, '$1')
        .replace(/(<[^<]+?)\sdir="[\s]*"/gim, '$1');
    }

    return html;
  }
  */

  setCurrentPath(editor, path) {
    this.currentPath = path
    this.updateTitle(editor)
  }

  updateTitle(editor) {
    let dirty = this.isDirty(editor)
    let fname = this.currentPath ? this.currentPath.match(/[^\/]*$/)[0] : 'untitled.html'
    let directory = this.currentPath ? this.currentPath.match(/^(.*)\/[^\/]*$/)[1] : null
    getCurrentWindow().setTitle(`${fname}${dirty ? '*' : ''} - WebDocs${directory ? ' - ' + directory : ''}`)
  }
}

export default function(Jodit) {
  Jodit.defaultOptions.controls.newFile = newFile
  Jodit.defaultOptions.controls.openFile = openFile
  Jodit.defaultOptions.controls.saveFile = saveFile

  Jodit.plugins.add('file', File);
}
