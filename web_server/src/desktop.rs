use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};
use std::vec::Vec;
use std::sync::{Mutex, Arc, Condvar};

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
  pub fn serve(&mut self, win: &tauri::Webview<R>, options: ServerOptions) -> crate::Result<ServeResponse> {
    let server = WebServer::new(&self.app, win, options).unwrap();
    let id = server.id.clone();
    self.servers.push(server);
    Ok(ServeResponse {
      address: id,
    })
  }

  pub fn respond_server<'s>(self: &'s mut Self, id: &str, res: Response) -> crate::Result<()> {
    for srv in self.servers.iter() {
      println!("iterate server {} ({})", srv.id, id);
      if srv.id != id { continue; }

      srv.respond(res)?;
    
      return Ok(())
    }
    Err(crate::Error::NoServer(id.to_string()))
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

use http::{Uri, response};
use tiny_http::{Header, Response as HttpResponse, Server};
use std::net::TcpListener;

pub struct WebServer {
  id: String,
  server: Arc<Server>,
  thread: Option<std::thread::JoinHandle<()>>,
  resp: Arc<(Mutex<Option<Response>>, Condvar)>
}

impl WebServer {
  pub fn new<R: Runtime>(app: &AppHandle<R>, win: &tauri::Webview<R>, options: ServerOptions) -> crate::Result<Self> {
    let asset_resolver = app.asset_resolver();
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let addr = listener.local_addr().unwrap().to_string();
    let server = Arc::new(Server::from_listener(listener.try_clone().unwrap(), None).expect("Unable to spawn server"));
    let server2 = server.clone();
    let win2 = win.clone();

    let pair = Arc::new((Mutex::new(None), Condvar::new()));
    let pair2 = Arc::clone(&pair);

    let thread = std::thread::spawn(move || {
      for req in server.incoming_requests() {
        let path: String = req
          .url()
          .parse::<Uri>()
          .map(|uri| uri.path().into())
          .unwrap_or_else(|_| req.url().into());
        let path2: String = path.clone();

        let request = Request {
          url: req.url().into(),
          path: path.clone(),
        };

        let mut response = Response {
          headers: Default::default(),
          body_data: None,
          body_text: None,
        };

        println!("[web-server {}] request {} (include assets: {})", addr, req.url(), options.serve_assets);

        if options.serve_assets {
          for asset in asset_resolver.iter() {
            println!("asset {}", asset.0)
          }

          #[allow(unused_mut)]
          if let Some(mut asset) = asset_resolver.get(path) {
            println!("[web-server {}] asset found at {}", addr, path2);

            response.add_header("Content-Type", asset.mime_type);
            if let Some(csp) = asset.csp_header {
              response
                .headers
                .insert("Content-Security-Policy".into(), csp);
            }

            response.body_data = Some(asset.bytes);
          }
        }

        let handler = options.handler.clone().unwrap_or("".to_string());
        if handler != "" {
          let id:  String = serde_json::to_string(&addr).unwrap();
          let req: String = serde_json::to_string(&request).unwrap();
          let res: String = serde_json::to_string(&response).unwrap();
          let js = format!("window['_{}']([{}, {}, {}])",
            handler,
            id, req, res);
          println!("[web-server {}] notify request {}", addr, js);
          win2.eval(&js);
          // app.get_webview_window().eval(&js);

          // Wait for response from javascript
          println!("[web-server {}] wait for response", addr);
          let (lock, cvar) = &*pair;
          let _guard = cvar.wait_while(lock.lock().unwrap(), |pending| {
            if let Some(res) = pending.take() {
              response = res;
              println!("[web-server {}] got response", addr);
              // println!("[web-server {}] got response {}", addr, serde_json::to_string(&response).unwrap());
              false
            } else {
              true
            }
          }).unwrap();
        }

        if let Some(body_data) = response.body_data {
          let mut resp = HttpResponse::from_data(body_data);
          for (header, value) in response.headers {
            if let Ok(h) = Header::from_bytes(header.as_bytes(), value) {
              resp.add_header(h);
            }
          }
          req.respond(resp).expect("unable to setup response");
        } else {
          let mut resp = match response.body_text {
            Some(body_text) => HttpResponse::from_string(body_text),
            None => HttpResponse::from_string(""),
          };
          for (header, value) in response.headers {
            if let Ok(h) = Header::from_bytes(header.as_bytes(), value) {
              resp.add_header(h);
            }
          }
          req.respond(resp).expect("unable to setup response");
        }

      }
    });
    println!("[web-server] start on {}", listener.local_addr().unwrap());
    Ok(WebServer{
      id: listener.local_addr().unwrap().to_string(),
      server: server2,
      thread: Some(thread),
      resp: pair2,
    })
  }

  pub fn respond(&self, res: Response) -> crate::Result<()> {
    // println!("[web-server {}] front responded {}", self.id, serde_json::to_string(&res).unwrap());
    let (lock, cvar) = &*self.resp;
    let mut response = lock.lock().unwrap();
    *response = Some(res);
    cvar.notify_one();
    Ok(())
  }

  pub fn close(mut self) -> crate::Result<()> {
    println!("[web-server] stop on {}", self.id);
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
