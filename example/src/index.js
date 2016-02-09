import "file?name=index.html!./index.html";

import React, {Component} from "react";
import {render} from "react-dom";

import Perpetually from "../../src";

window.React = React;

const elements = [];

for (let i = 0; i < 100000; i++) {
  const heights = [50, 66, 75, 100];
  const height = heights[i % heights.length];
  elements.push(<div style={{height, margin: "1rem", border: "1px solid grey"}} key={i}>{i}</div>);
}

export default class Example extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <Perpetually>
      {elements}
    </Perpetually>;
  }
}

render(<Example/>, document.getElementById("body"));
