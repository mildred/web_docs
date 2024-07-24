use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::WebServerExt;

#[command]
pub(crate) async fn serve<R: Runtime>(
    app: AppHandle<R>,
    payload: ServerOptions,
) -> Result<ServeResponse> {
    app.web_server().lock().unwrap().serve(payload)
}

#[command]
pub(crate) async fn close<R: Runtime>(
    app: AppHandle<R>,
    payload: ServeResponse,
) -> Result<()> {
    app.web_server().lock().unwrap().close_server(&payload.address)?;
    Ok(())
}
