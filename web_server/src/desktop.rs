use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};
use std::vec::Vec;
use std::sync::{Mutex, Arc};

use crate::models::*;

// #[deny(elided_lifetimes_in_paths)]
pub fn init<'a, R: Runtime, C: DeserializeOwned>(
  app: &'a AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<Arc<Mutex<WebServerPlugin<R>>>> {
  Ok(Mutex::new(WebServerPlugin{
      app: app.clone(),
      servers: vec![],
  }).into())
}

/// Access to the web-server APIs.
pub struct WebServerPlugin<R: Runtime> {
  app: AppHandle<R>,
  servers: Vec<WebServer>
}

impl<R: Runtime> WebServerPlugin<R> {
  pub fn serve(&self, options: ServerOptions) -> crate::Result<ServeResponse> {
    let server = WebServer::new(&self.app, options).unwrap();
    Ok(ServeResponse {
      address: WebServer::address(&server)?,
    })
  }

  pub fn close_server<'s>(self: &'s mut Self, id: &str) -> crate::Result<()> {
    let mut i = 0;
    while i < self.servers.len() {
      if self.servers[i].id == id {
        let srv: WebServer = self.servers.swap_remove(i);
        srv.close()?;
        return Ok(())
      }
      i = i + 1;
    }
    Err(crate::Error::NoServer(id.to_string()))
  }
}

use std::collections::HashMap;
use http::Uri;
use tiny_http::{Header, Response as HttpResponse, Server};
use std::net::TcpListener;

pub struct Request {
    url: String,
}

impl Request {
    pub fn url(&self) -> &str {
        &self.url
    }
}

pub struct Response {
    headers: HashMap<String, String>,
}

impl Response {
    pub fn add_header<H: Into<String>, V: Into<String>>(&mut self, header: H, value: V) {
        self.headers.insert(header.into(), value.into());
    }
}

pub struct WebServer {
  id: String,
  listener: TcpListener,
  server: Arc<Server>,
  thread: Option<std::thread::JoinHandle<()>>,
}

impl WebServer {
  pub fn new<R: Runtime>(app: &AppHandle<R>, _options: ServerOptions) -> crate::Result<Self> {
    let asset_resolver = app.asset_resolver();
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let server = Arc::new(Server::from_listener(listener.try_clone().unwrap(), None).expect("Unable to spawn server"));
    let server2 = server.clone();
    let thread = std::thread::spawn(move || {
      for req in server.incoming_requests() {
        let path = req
          .url()
          .parse::<Uri>()
          .map(|uri| uri.path().into())
          .unwrap_or_else(|_| req.url().into());

        #[allow(unused_mut)]
        if let Some(mut asset) = asset_resolver.get(path) {
          let _request = Request {
            url: req.url().into(),
          };
          let mut response = Response {
            headers: Default::default(),
          };

          response.add_header("Content-Type", asset.mime_type);
          if let Some(csp) = asset.csp_header {
            response
              .headers
              .insert("Content-Security-Policy".into(), csp);
          }

          //if let Some(on_request) = &on_request {
          //  on_request(&request, &mut response);
          //}

          let mut resp = HttpResponse::from_data(asset.bytes);
          for (header, value) in response.headers {
            if let Ok(h) = Header::from_bytes(header.as_bytes(), value) {
              resp.add_header(h);
            }
          }
          req.respond(resp).expect("unable to setup response");
        }
      }
    });
    Ok(WebServer{
      id: listener.local_addr().unwrap().to_string(),
      listener,
      server: server2,
      thread: Some(thread),
    })
  }

  pub fn address(web_server: &Self) -> crate::Result<String> {
    let addr = web_server.listener.local_addr().unwrap();
    Ok(addr.to_string())
  }

  pub fn close(mut self) -> crate::Result<()> {
    self.server.unblock();
    if let Some(thread) = self.thread.take() {
      let _ = thread.join();
    }
    Ok(())
  }
}

/*

use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};

pub struct WebServer {
  server: HttpServer,
  webapp: WebServerApp,
}

pub struct WebServerApp {
}

pub fn handle(_data: web::Data<WebServerApp>) {
}

impl WebServer {
  pub fn new<R: Runtime>(app: &AppHandle<R>, options: ServerOptions) -> crate::Result<Self> {
    let webapp = WebServerApp {};
    let server = HttpServer::new(|| {
      App::new()
        .app_data(web::Data::new(webapp))
        .default_service(handle)
    });
    let web_server = WebServer { server, webapp };
    tauri::async_runtime::spawn(
      web_server.server.bind(("127.0.0.1", 8080))?.run()
    );
    Ok(web_server)
  }

  pub fn stop(web_server: Self) {
    web_server.server.shutdown_timeout(0);
  }
}

*/
