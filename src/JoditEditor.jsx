import JoditEditor, { Jodit } from 'jodit-react'

import { registerPlugins } from './plugins'

registerPlugins(Jodit)

export { Jodit }
export default JoditEditor
