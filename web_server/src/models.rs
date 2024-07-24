use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerOptions {
  pub serve_assets: bool,
  pub handler: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServeResponse {
  pub address: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct Request {
    pub url: String,
    pub path: String,
}

impl Request {
    pub fn url(&self) -> &str {
        &self.url
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct Response {
    pub headers: HashMap<String, String>,
    pub body_data: Option<Vec<u8>>,
    pub body_text: Option<String>,
}

impl Response {
    pub fn add_header<H: Into<String>, V: Into<String>>(&mut self, header: H, value: V) {
        self.headers.insert(header.into(), value.into());
    }
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct RespondPayload {
  pub id: String,
  pub response: Response,
}

