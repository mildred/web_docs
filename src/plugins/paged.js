import { Previewer } from 'pagedjs';

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

function debounce(delay, func) {
  let timer = null
  return (...args) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => func(...args), delay)
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

    editor.events.on('change', debounce_heavy(100, e => {
      if (this.preview) this.renderPreview(editor)
    }));

    editor.events.on('postProcessSetEditorValue', e => {
      const iframe = editor.container.querySelector('.jodit-wysiwyg_iframe')
      iframe.contentDocument.documentElement.classList.toggle('jodit-wysiwyg_iframe', true)
    })
  }

  destruct() {
    this.css?.remove()
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
      this.renderPreview(editor)
    }
  }

  renderPreview(editor){
    const iframe = editor.container.querySelector('.jodit-wysiwyg_iframe')
    const dom_content = iframe.contentDocument.body // not documentElement
    this.preview_container.contentDocument.head.innerHTML = iframe.contentDocument.head.innerHTML + `
      <link rel="stylesheet" href="/src/paged_interface.css" media="screen" />
    `
    // Cannot reuse the previewer
    // https://gitlab.coko.foundation/pagedjs/pagedjs/-/issues/457
    const paged = new Previewer()
    const styles = paged.removeStyles(this.preview_container.contentDocument)
    paged.preview(dom_content, styles, this.preview_container.contentDocument.body)
  }
}

export default function(Jodit) {
  Jodit.defaultOptions.controls.previewPage = previewPage

  Jodit.plugins.add('paged', Paged);
}
