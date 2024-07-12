import file from './file'
import paged from './paged'

// Configurable popup when button is clicked can be found as an example in
// jodit/src/plugins/mobile/config.ts for the dots control

export function registerPlugins(Jodit) {
  file(Jodit)
  paged(Jodit)
}
