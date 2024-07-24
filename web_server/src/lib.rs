use std::sync::{Mutex, Arc};
use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::WebServerPlugin;
#[cfg(mobile)]
use mobile::WebServerPlugin;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the web-server APIs.
pub trait WebServerExt<R: Runtime> {
  fn web_server(&self) -> &Arc<Mutex<WebServerPlugin<R>>>;
}

impl<R: Runtime, T: Manager<R>> crate::WebServerExt<R> for T {
  fn web_server(&self) -> &Arc<Mutex<WebServerPlugin<R>>> {
    self.state::<Arc<Mutex<WebServerPlugin<R>>>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("web-server")
    .invoke_handler(tauri::generate_handler![
      commands::serve,
      commands::close
    ])
    .setup(|app, api| {
      #[cfg(mobile)]
      let web_server = mobile::init(app, api)?;
      #[cfg(desktop)]
      let web_server = desktop::init(&app, api)?;
      app.manage(web_server);
      Ok(())
    })
    .build()
}
