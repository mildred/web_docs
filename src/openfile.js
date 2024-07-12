import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';

export async function askfile() {
  // Open a selection dialog for image files
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'HTML file',
      extensions: ['htm', 'html']
    }]
  });

  if (Array.isArray(selected)) {
    // user selected multiple files
    return null
  } else if (selected === null) {
    // user cancelled the selection
    return null
  } else {
    // user selected a single file
    console.log('selected', selected)
    return selected
  }
}

export async function openfile(path) {
  if (path === undefined) {
    let file = await askfile()
    path = file?.path
  }

  if (! path) return null

  return await readTextFile(path)
}
