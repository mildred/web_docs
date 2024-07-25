import { Previewer } from 'pagedjs';
import { Command, open } from "@tauri-apps/plugin-shell";
import { resolveResource, tempDir, join } from '@tauri-apps/api/path'
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { serve, closeServer, respondServer } from '../../web_server/guest-js/index'

const css = `
  .jodit-container:not(.jodit_inline) .jodit-workplace.jodit-workplace__paged-preview {
    display: flex;
    flex-flow: row wrap;
  }
  .jodit-container .jodit-workplace.jodit-workplace__paged-preview .jodit-wysiwyg_iframe {
    width: unset;
    flex: 50% 0 0;
  }
  .jodit-container .jodit-workplace > .paged-preview {
    flex: 50% 0 0;
  }
`

const previewPage = {
  icon: 'eye',
  tooltip: "Preview",

  async exec(editor) {
    const { paged } = editor.__plugins
    paged.togglePreview(editor)
  },

  isActive(editor) {
    const { paged } = editor.__plugins
    return paged.preview
  }
}

const printPage = {
  icon: 'print',
  tooltip: "Print",

  async exec(editor) {
    const { paged } = editor.__plugins
    paged.printPage(editor)
  },
}

function debounce(delay, func) {
  let timer = null
  return (...args) => {
    // Cancel previous calls that are still in the timeout phase
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }

    timer = setTimeout(() => {
      // run the actual function after the delay
      timer = null
      func(...args)
    }, delay)
  }
}

class Paged {
  buttons = [
  ]

  init(editor) {
    this.preview = false
    this.css = editor.ow.document.createElement('style')
    this.css.textContent = css
    editor.ow.document.head.insertBefore(this.css, null)

    this.triggerRender = debounce(500, () => {
      if (this.preview) this.renderPreview(editor)
    })

    editor.events.on('change', this.triggerRender);

    editor.events.on('postProcessSetEditorValue', e => {
      const iframe = editor.container.querySelector('.jodit-wysiwyg_iframe')
      iframe.contentDocument.documentElement.classList.toggle('jodit-wysiwyg_iframe', true)
    })

    serve({
      serveAssets: true,
      handler: this.httpHandler.bind(this, editor)
    }).then(addr => {
      console.log("server at %o", addr)
      this.server = addr
    })
  }

  destruct() {
    if(this.server) closeServer(this.server)
    this.css?.remove()
  }

  httpHandler(editor, [id, req, res]){
    console.log("[%o] http handler", id, req, res)
    if (req.path == "/") {
      const iframe = editor.container.querySelector('.jodit-wysiwyg_iframe')
      const dom_content = iframe.contentDocument.documentElement

      const style = iframe.contentDocument.createElement('link')
      style.setAttribute('rel', 'stylesheet')
      style.setAttribute('media', 'screen')
      style.setAttribute('href', '/paged_interface.css')

      const importmap = iframe.contentDocument.createElement('script')
      importmap.setAttribute('type', 'importmap')
      importmap.textContent = JSON.stringify({
        imports: {
          'pagedjs': '/pagedjs.js',
        }
      })

      const script = iframe.contentDocument.createElement('script')
      script.setAttribute('src', '/pagedjs-polyfill.js')

      iframe.contentDocument.head.insertBefore(style, iframe.contentDocument.head.firstChild)
      iframe.contentDocument.head.insertBefore(script, iframe.contentDocument.head.firstChild)
      iframe.contentDocument.head.insertBefore(importmap, iframe.contentDocument.head.firstChild)

      res.body_data = null
      res.body_text = editor.value
      res.headers['Content-Type'] = 'text/html; charset=utf-8'

      style.remove()
      script.remove()
      importmap.remove()
    }
    respondServer(id, res)
    console.log("[%o] http handler responded", id, res)
    return res
  }

  togglePreview(editor) {
    let workplace = editor.container.querySelector('.jodit-workplace')
    if (this.preview) {
      this.preview = false
      workplace.classList.toggle('jodit-workplace__paged-preview', false)
      editor.container.querySelector('.jodit-workplace > .paged-preview').remove()
      this.preview_container = null
    } else {
      let div = editor.ow.document.createElement('iframe')
      div.classList.add('paged-preview')
      div.innerHTML = "<h1>\\o/</h1>"
      workplace.classList.toggle('jodit-workplace__paged-preview', true)
      workplace.insertBefore(div, null)
      this.preview_container = div
      this.preview = true
      this.triggerRender(editor)
    }
  }

  renderPreview(editor){
    const iframe = editor.container.querySelector('.jodit-wysiwyg_iframe')
    const dom_content = iframe.contentDocument.body // not documentElement
    this.preview_container.contentDocument.documentElement.classList.toggle('paged-preview-single-sided', true)
    this.preview_container.contentDocument.body.innerHTML = ''
    this.preview_container.contentDocument.head.innerHTML = iframe.contentDocument.head.innerHTML + `
      <link rel="stylesheet" href="/paged_interface.css" media="screen" />
    `
    // Cannot reuse the previewer
    // https://gitlab.coko.foundation/pagedjs/pagedjs/-/issues/457
    const paged = new Previewer()
    const styles = paged.removeStyles(this.preview_container.contentDocument)
    paged.preview(dom_content, styles, this.preview_container.contentDocument.body)
  }

  printPageTauri(editor) {
    getCurrentWebview().print([
      { Silent: true },
      { GeneratePDF: {
        filename: "/tmp/webdocs.pdf"
      } },
    ])
  }

  async printPageHttpServer(editor) {
    open(`http://${this.server}`)
  }

  async printPage(editor) {
    return await this.printPageHttpServer(editor)
    //return this.printPageTauri(editor)

    let bin_dir = await resolveResource('./bin')
    let pagedjs_dir = await resolveResource('../node_modules/pagedjs-cli')
    let tmp = await tempDir()
    let rand = crypto.randomUUID()
    let html_path = await join(tmp, `${rand}.html`)
    let pdf_path = await join(tmp, `${rand}.pdf`)

    writeTextFile(html_path, editor.value)

    let command = Command.sidecar('./bin/node', [await join(pagedjs_dir, 'src', 'cli.js'), "-i", html_path, "-o", pdf_path], {
      env: {
        // https://github.com/hardkoded/puppeteer-sharp/issues/2633
        XDG_CONFIG_HOME: await join(tmp, `${rand}.chromium-config`),
        XDG_CACHE_HOME:  await join(tmp, `${rand}.chromium-cache`)
      }
    })
    try {
      const output = await command.execute()
      console.log("Generated PDF (%o):\n%s", output, output.stdout + output.stderr)

      open(pdf_path)
    } catch (e) {
      alert(e)
    }
  }
}

export default function(Jodit) {
  Jodit.defaultOptions.controls.previewPage = previewPage
  Jodit.defaultOptions.controls.printPage   = printPage

  Jodit.plugins.add('paged', Paged);
}
