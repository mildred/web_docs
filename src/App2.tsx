import React, { useState, useEffect, useRef, useMemo } from 'react';
import JoditEditor, { Jodit } from './JoditEditor';

import ace from 'ace-code/src/ace'
window.ace = ace

import beautify from 'js-beautify';
window.html_beautify = beautify.html

console.log(JSON.stringify(Jodit.defaultOptions.buttons))
console.log(JSON.stringify(Jodit.defaultOptions.buttonsSM))
console.log(JSON.stringify(Jodit.defaultOptions.buttonsXS))

const App = ({}) => {
  const editor = useRef(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    return () => {
      // alert('Losing all your data !!!')
    }
  }, [])

  /*
  const buttons = (small, xsmall) => ([
    {group: "file",       buttons: ['newFile', 'openFile', 'saveFile']},
    {group: "history",    buttons: []},
    // {group: "clipboard", buttons: []},
    {group: "clipboard2", buttons: ["cut", "copy", "paste"]}, // copyformat
    {group: "copyformat", buttons: ["copyformat"]},
    "---",
    //{group: "insert",     buttons: []},
    {group: "insert2",    buttons: ["table", "hr", "symbols", "link"]},
    "---",
    {group: "search",     buttons: []},
    {group: "state",      buttons: []},
    {group: "source",     buttons: []},
    //{group: "other",      buttons: []},
    //{group: "info",       buttons: []}
    "\n",
    //{group: "font",       buttons: []},
    {group: "font2",      buttons: ["font", "fontsize", "paragraph"]},
    //{group: "form",       buttons: []},
    {group: "font-style", buttons: []},
    {group: "script2",    buttons: ["subscript", "superscript"]},
    //{group: "script",     buttons: []},
    {group: "color",      buttons: []},
    {group: "indent",     buttons: []},
    {group: "list",       buttons: []},
    //{group: "media",      buttons: []},
    "---",
    (small ? "dots" : null)
  ].filter(x => x))
  */
  const buttons = (small, xsmall) => ([
    {group: "file",       buttons: [ 'newFile', 'openFile', 'saveFile' ]},
    {group: "history",    buttons: []},
    {group: "clipboard2", buttons: ["cut", "copy", "paste"]}, // {group: "clipboard", buttons: []},
    "|",
    "copyformat", // was in group clipboard
    "---",
    {group: "insert2",    buttons: ["table", "hr", "symbols", "link"]}, //{group: "insert", buttons: []},
    "---",
    {group: "search",     buttons: []},
    {group: "state",      buttons: []},
    {group: "source",     buttons: ['previewPage']},
    "\n",
    {group: "font2",      buttons: ["font", "fontsize", "paragraph"]}, //{group: "font", buttons: []},
    {group: "font-style", buttons: []},
    (small  ? null : {group: "script2",    buttons: ["subscript", "superscript"]}), //{group: "script", buttons: []},
    (small  ? null : {group: "color",      buttons: []}),
    (xsmall ? null : {group: "indent",     buttons: []}),
    (small  ? null : {group: "list",       buttons: []}),
    "---",
    //{group: "other",      buttons: []},
    //{group: "info",       buttons: []}
    //{group: "media",      buttons: []},
    //{group: "form",       buttons: []},
    (small ? "dots" : null)
  ].filter(x => x))

  const config = useMemo(
    () => ({
      height: '100%',
      width: '100%',
      readonly: false, // all options from https://xdsoft.net/jodit/docs/,
      sourceEditorCDNUrlsJS: [],
      beautifyHTMLCDNUrlsJS: [],
      showPlaceholder: false,
      iframe: true,
      // iframeCSSLinks: [ 'https://cdn.jsdelivr.net/npm/jodit-pro@4.2.24/es2021.en/jodit.fat.min.css' ],
      iframeStyle: `
        html.jodit-wysiwyg_iframe body {
          font-family: Arial, sans-serif;
          font-size: 16px;
          color: #333;
          line-height: 1.6;
          width: 15.8cm !important;
          min-height: 21cm !important;
          box-sizing: content-box !important;
          padding: 1cm 1cm 2cm !important;
          border: 1px #d3d3d3 solid !important;
          margin: 0.5cm auto !important;
          background: white !important;
          border-radius: 5px !important;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.1) !important;
          font-size: 12pt !important;
        }
        p {
          margin-top: 0;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        @media print {

          @page {
            size: A5;
            margin-top: 10mm;
            margin-bottom: 25mm;

          @page:left {
            margin-right: 20mm;
            margin-left: 15mm;
          }

          @page:right {
            margin-right: 15mm;
            margin-left: 20mm;
          }

          @page {
            @bottom-left {
              content: counter(page);
            }

            @bottom-center {
              content: string(title);
              text-transform: uppercase;
            }

          }

          h1 {
            string-set: title content(text);
          }

        }
      `,
      editHTMLDocumentMode: true,
      toolbarAdaptive: true, // does not work very well
      buttons: buttons(false, false),
      buttonsMD: buttons(true, false),
      buttonsXS: buttons(true, true),
      //buttons: ["bold","italic","underline","strikethrough","eraser","ul","ol","font","fontsize","paragraph","superscript","subscript","classSpan","spellcheck","cut","copy","paste","copyformat","hr"]
      controls: {
        paragraph: {
          component: 'select'
        },
        font: {
          component: 'select'
        },
        fontsize: {
          component: "select"
        }
      }
    }),
    []
  );

  return (
    <JoditEditor
      ref={editor}
      value={content}
      config={config}
      // tabIndex of textarea
      tabIndex={1}
      // preferred to use only this option to update the content for performance reasons
      onBlur={(newContent) => setContent(newContent)}
      onChange={(newContent) => {}}
    />
  );
};

export default App
