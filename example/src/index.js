import "file?name=index.html!./index.html";

import React, {Component} from "react";
import {randomBytes} from "crypto";
import {times, random} from "lodash";
import {update} from "react-addons-update";
import {render} from "react-dom";

import Perpetually from "../../src";

window.React = React;

function generateItem(i="") {
  const name = randomBytes(8).toString("hex");
  const height = random(50, 250);
  // const height = 150;

    // <img height={height} src={`http://lorempixel.com/g/${500}/${height}/`} style={{width: "100%"}} alt=""/>
  return <div key={name} style={{margin: "1rem"}}>
    <img src={`http://lorempixel.com/g/${500}/${height}/`} style={{width: "100%"}} alt=""/>
    {i} {name}
  </div>;
}

const initialItems = times(250, generateItem);

export default class Example extends Component {
  constructor(props) {
    super(props);

    this.state = {
      items: initialItems,
      numberOfColumns: 3,
    };
  }

  addTop() {
    this.state.items.unshift(generateItem());
    this.forceUpdate();
  }

  addBottom() {
    this.state.items.push(generateItem());
    this.forceUpdate();
  }

  removeTop() {
    this.state.items.splice(0, 1);
    this.forceUpdate();
  }

  removeBottom() {
    this.state.items.splice(this.state.items.length - 1, 1);
    this.forceUpdate();
  }

  addColumn() {
    this.setState({numberOfColumns: this.state.numberOfColumns + 1});
  }

  removeColumn() {
    this.setState({numberOfColumns: Math.max(1, this.state.numberOfColumns - 1)});
  }

  render() {
    return <div>
      <div style={{position: "fixed", textAlign: "right", right: "0"}}>
      <button onClick={::this.addColumn}>Add column</button>
      <button onClick={::this.removeColumn}>Remove column</button>

        <button onClick={::this.addTop}>Add top</button>
        <button onClick={::this.addBottom}>Add bottom</button>

        <button onClick={::this.removeTop}>Remove top</button>
        <button onClick={::this.removeBottom}>Remove bottom</button>
      </div>
      <Perpetually numberOfColumns={this.state.numberOfColumns}>
        {this.state.items}
      </Perpetually>
    </div>;
  }
}

render(<Example/>, document.getElementById("body"));
