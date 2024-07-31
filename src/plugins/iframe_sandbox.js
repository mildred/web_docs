class IframeSandbox {
  init(editor) {
    this.setSandbox(editor)
    editor.events.on('generateDocumentStructure.iframe', e => {
      this.setSandbox(editor)
    })
  }

  setSandbox(editor){
    editor.iframe?.setAttribute("sandbox", "")
  }
}

export default function(Jodit) {
  Jodit.plugins.add('iframe-sandbox', IframeSandbox);
}
