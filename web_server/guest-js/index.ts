import { invoke, transformCallback } from '@tauri-apps/api/core'

type ServerRequest = {
  path: string
  url: string
}

type ServerResponse = {
  headers: {
    [name: string]: string
  },
  body_data: [number] | object,
  body_text: string,
}

type ServerOptions = {
  serveAssets: boolean,
  handler: string | (string, ServerRequest, ServerResponse) => ServerResponse,
}

type ServerInstance = {
  address: string
}

export async function serve(options: ServerOptions): Promise<null | ServerInstance> {
  if (typeof(options.handler) == 'function') options.handler = transformCallback(options.handler).toString()

  return await invoke<{value?: ServerInstance}>('plugin:web-server|serve', {
    payload: options,
  }).then((r) => (r.address ? r.address : null));
}

export async function closeServer(address: string): Promise<null | ServerInstance> {
  return await invoke<{value?: ServerInstance}>('plugin:web-server|close', {
    address: address,
  })
}

export async function respondServer(address: string, response: ServerResponse): Promise<null | ServerInstance> {
  return await invoke<{value?: ServerInstance}>('plugin:web-server|respond', {
    payload: {
      id: address,
      response: response,
    }
  })
}
