require("babel/polyfill");
require("chance");

import React from "react/addons";

import $ from "jquery";
import throttle from "per-frame";
import times from "lodash.times";
import uuid from "node-uuid";

let items = [];

let generateItem = (i) => {
  return {
    id: uuid.v4(),
    text: `${i}: ${chance.paragraph({sentences: chance.integer({min: 1, max: 3})})}`
  };
};

times(12, i => {
  items.push(generateItem(i))
});

class Entry extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return <div style={{margin: 0, padding: 0, overflow: "hidden"}}>
        <p className="entry">{this.props.item.text}</p>
    </div>;
  }
}

const BATCH_SIZE = 2;

// const EXTRA_TOP_ELEMENTS = 1;
// const EXTRA_BOTTOM_ELEMENTS = 1;

class List extends React.Component {
  constructor(props) {
    super(props);

    // this.handleScroll = throttle(this.handleScroll);

    this.rects = new Map(),

    this.state = {
      start: 0,
      end: 0,

      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
    };
  }

  componentWillMount() {
    let initialEnd = Math.min(this.props.items.length, BATCH_SIZE);
    this.setState({end: initialEnd});
  }

  componentWillReceiveProps(newProps) {
    // console.group("componentWillReceiveProps");

    let newKeys = newProps.items.map(item => item.key);
    let oldKeys = this.props.items.map(item => item.key);

    let newKeysSet = new Set(newKeys);
    let oldKeysSet = new Set(oldKeys);

    let removedKeys = oldKeys.filter(key => !newKeysSet.has(key));
    let addedKeys = newKeys.filter(key => !oldKeysSet.has(key));

    for (let key of removedKeys) {
      this.rects.delete(key);
    }

    if (newProps.items.length < this.props.items.length) {
      // console.log("Fewer items");
    }

    this.props = newProps;

    console.log("CALLING HANDLE SCROLL EXPLICTLY! :X")
    this.handleScroll();
    // console.groupEnd("componentWillReceiveProps");
  }

  update() {
    if (!this.props.items.length) {
      return;
    }

    // console.group("update");
    let itemNodes = [].slice.call(React.findDOMNode(this.refs.itemsContainer).children);

    itemNodes.forEach((itemNode, i) => {
      let itemIndex = i + this.state.start;

      let relativeRect = itemNode.getBoundingClientRect();

      let rect = {}

      rect.height = Math.round(relativeRect.height);
      rect.top = Math.round(relativeRect.top + window.scrollY);
      rect.bottom = Math.round(relativeRect.bottom + window.scrollY);

      this.rects.set(this.props.items[itemIndex].key, rect);
    })

    if (this.extraTopElements) {
      // console.log("ScrollY", window.scrollY);

      // console.log("Need to render", this.extraTopElements, "new elements above");
      // console.log("Currently at", this.state.start);

      for (let i = 0; i < this.extraTopElements; i++) {
        // console.log("Checking new element", this.state.start + i);
        let rect = this.rects.get(this.props.items[this.state.start + i].key);
        // console.log("Scrolling down", rect.height);
        console.log("DOING THE SCROLL! :D")
        window.scrollBy(0, rect.height);
      }

      this.extraTopElements = 0;

      // console.log("New ScrollY", window.scrollY);
    }

    if (this.state.end !== this.props.items.length) {
      let bottom = React.findDOMNode(this).getBoundingClientRect().bottom;

      if (bottom <= Math.round($(window).height())) {
        // console.log("Bottom reached");
        this.setState({end: Math.min(this.props.items.length, this.state.end + 1)});
      }
    } else {
      // console.log("Load items below");
      let bottom = React.findDOMNode(this).getBoundingClientRect().bottom;

      if (bottom <= Math.round($(window).height())) {
        // console.log("Load more!")
      }
    }
    // console.groupEnd("update");
  }

  computeStartAndTopSpacerHeight() {
    let topSpacerHeight = 0;

    for (let i = 0; i < this.props.items.length; i++) {

      let item = this.props.items[i];
      let rect = this.rects.get(item.key);

      if (!rect) {
        continue;
      }

      if (rect.bottom - window.scrollY >= 0) {
        let newStart = i;
        let extraStart = newStart;

        for (let j = 1; j <= BATCH_SIZE; j++) {
          let extraItem = this.props.items[newStart - j];

          if (!extraItem) {
            break;
          }

          let extraRect = this.rects.get(extraItem.key);

          if (!extraRect) {
            break;
          }

          extraStart = newStart - j;
          topSpacerHeight -= extraRect.height;
        }

        // console.log("Start", newStart, "Extra", extraStart, "BATCH_SIZE", BATCH_SIZE);
        // console.log("Required", BATCH_SIZE - (newStart - extraStart));

        this.extraTopElements = Math.min(newStart, Math.min(newStart, BATCH_SIZE) - (newStart - extraStart));

        // console.log("Real required", this.extraTopElements);

        return {start: Math.max(0, newStart - BATCH_SIZE), topSpacerHeight};
      } else {
        topSpacerHeight += rect.height;
      }
    }

    return {start: 0, topSpacerHeight: 0};
  }

  computeEndAndBottomSpacerHeight() {
    let bottomSpacerHeight = 0;

    for (let i = this.props.items.length - 1; i >= 0; i--) {
      console.log("Looking for end at", i);

      let item = this.props.items[i];
      let rect = this.rects.get(item.key);

      if (!rect) {
        continue;
      }

      if (rect.top - window.scrollY <= Math.round($(window).height())) {
        let newEnd = Math.min(this.props.items.length, i + 1);
        return {end: newEnd, bottomSpacerHeight};
      } else {
        bottomSpacerHeight += rect.height;
      }
    }

    return {end: 1, bottomSpacerHeight: 0};
  }

  componentDidMount() {
    this.update();

    // TODO
    $(window).on("scroll", this.handleScroll.bind(this));
    $(window).on("resize", this.handleScroll.bind(this));
  }

  componentDidUnmount() {
    // $(window).off("scroll", this.handleScroll.bind(this));
    // $(window).on("resize", this.handleScroll.bind(this));
  }

  componentDidUpdate() {
    this.update();
  }

  handleScroll() {
    console.log("HANDLE SCROLL ;-)");
    // console.group("handleScroll");
    let {start, topSpacerHeight} = this.computeStartAndTopSpacerHeight()
    let {end, bottomSpacerHeight} = this.computeEndAndBottomSpacerHeight();

    this.setState({
      start,
      end,
      topSpacerHeight,
      bottomSpacerHeight
    })

    // console.groupEnd("handleScroll");
  }

  render() {
    // console.group("render")
    let shownItems = this.props.items.slice(this.state.start, this.state.end);

    // console.groupEnd("render")
    return (
      <div style={{background: "yellow"}}>
        <div ref="topSpacer" style={{height: `${this.state.topSpacerHeight}px`, background: "red"}}/>
        <div ref="itemsContainer">
          {shownItems}
        </div>
        <div ref="bottomSpacer" style={{height: `${this.state.bottomSpacerHeight}px`, background: "blue"}}/>
      </div>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      items: items
    }
  }

  resetAll() {
    this.setState({
      items: items,
    });
  }

  addTop() {
    let newItems = this.state.items.slice();
    newItems.unshift(generateItem(items.length - this.state.items.length - 1));
    this.setState({items: newItems});
  }

  addBottom() {
    let newItems = this.state.items.slice();
    newItems.push(generateItem(this.state.items.length + 1));
    this.setState({items: newItems});
  }

  addSecond() {
    let newItems = [...this.state.items];
    console.log(newItems);
    newItems.splice(1, 0, generateItem(this.state.items.length + 1));
    this.setState({items: newItems});
  }

  removeTop() {
    let newItems = this.state.items.slice();
    newItems.splice(0, 1);
    this.setState({items: newItems});
  }

  removeBottom() {
    let newItems = this.state.items.slice();
    newItems.splice(this.state.items.length - 1, 1);
    this.setState({items: newItems});
  }

  removeSecond() {
    let newItems = this.state.items.slice();
    newItems.splice(1, 1);
    this.setState({items: newItems});
  }

  removeAll() {
    this.setState({
      items: [],
    });
  }

  render() {
    let entries = this.state.items.map(item => <Entry key={item.id} item={item}/>);

    return <div>
      <div style={{position: "fixed", right: "1rem", top: "1rem"}}>

        <button onClick={this.resetAll.bind(this)}>Reset all</button>
        <button onClick={this.addTop.bind(this)}>Add top</button>
        <button onClick={this.addBottom.bind(this)}>Add bottom</button>
        <button onClick={this.addSecond.bind(this)}>Add 2nd</button>

        <button onClick={this.removeAll.bind(this)}>Remove all</button>
        <button onClick={this.removeTop.bind(this)}>Remove top</button>
        <button onClick={this.removeBottom.bind(this)}>Remove bottom</button>
        <button onClick={this.removeSecond.bind(this)}>Remove 2nd</button>
      </div>

      <List items={entries}/>
    </div>
  }
}

React.render(<App/>, document.body);