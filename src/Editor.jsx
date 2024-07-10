import { Wax } from 'wax-prosemirror-core';
import  Layout  from './Layout';
import  config  from './config';

const Editor = () => {
  return (<Wax
     config={config}
     autoFocus
     placeholder="Type something..."
     value=''
     layout={Layout}
     onChange={source => console.log(source)}
   />)
};

export default Editor

