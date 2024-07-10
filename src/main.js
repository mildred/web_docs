import React from "react";
import ReactDOM from "react-dom";
import Editor from "./editors/WebDocs";

// React 18
// import ReactDOM from "react-dom/client";
// ReactDOM.createRoot(document.getElementById("root")).render(
//   React.createElement(Editor, {}, null));

ReactDOM.render(
  React.createElement(Editor, {}, null),
  document.getElementById("root"));

