import file from './file'
import paged from './paged'
import iframe_sandbox from './iframe_sandbox'

// Configurable popup when button is clicked can be found as an example in
// jodit/src/plugins/mobile/config.ts for the dots control

export function registerPlugins(Jodit) {
  file(Jodit)
  paged(Jodit)
  iframe_sandbox(Jodit)
}
