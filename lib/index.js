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

times(50, i => {
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

const BATCH_SIZE = 1;

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
      console.log("Fewer items");
    }

    this.props = newProps;

    this.handleScroll();
  }

  update() {
    console.log("[UPDATE]", "Start", this.state.start);
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

    if (this.requiresJump) {
      this.requiresJump = false;

      let addedHeight = 0;

      this.newRenderedItems.forEach(item => {
        let rect = this.rects.get(item.key)

        if (rect) {
          addedHeight += this.rects.get(item.key).height;
        }
      });

      window.scroll(0, addedHeight);
    }

    if (this.state.start !== 0) {
      let top = React.findDOMNode(this).getBoundingClientRect().top;

      if (top >= 0) {
        console.log("Top reached");

        this.requiresJump = true;

        let nextStart = Math.max(0, this.state.start - BATCH_SIZE - 1);

        this.newRenderedItems = this.props.items.slice(nextStart, this.state.start);

        this.setState({start: nextStart});
      }
    }

    if (this.state.end !== this.props.items.length) {
      let bottom = React.findDOMNode(this).getBoundingClientRect().bottom;

      if (bottom <= Math.round($(window).height())) {
        console.log("Bottom reached");
        this.setState({end: Math.min(this.props.items.length, this.state.end + BATCH_SIZE)});
      }
    } else {
      let bottom = React.findDOMNode(this).getBoundingClientRect().bottom;

      if (bottom <= Math.round($(window).height())) {
        // console.log("Load more!")
      }
    }
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
        let newStart = Math.max(0, i);
        return {start: newStart, topSpacerHeight};
      } else {
        topSpacerHeight += rect.height;
      }
    }
  }

  computeEndAndBottomSpacerHeight() {
    let bottomSpacerHeight = 0;

    for (let i = this.props.items.length - 1; i >= 0; i--) {

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

  handleResize() {

  }

  handleScroll() {
    let {start, topSpacerHeight} = this.computeStartAndTopSpacerHeight()
    let {end, bottomSpacerHeight} = this.computeEndAndBottomSpacerHeight();

    this.setState({
      start,
      end,
      topSpacerHeight,
      bottomSpacerHeight
    })
  }

  render() {
    let shownItems = this.props.items.slice(this.state.start, this.state.end);

    // console.log("Top spacer height", this.state.topSpacerHeight);
    // console.log("Bottom spacer height", this.state.bottomSpacerHeight);

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
        <button onClick={this.removeAll.bind(this)}>Add randomly</button>

        <button onClick={this.removeAll.bind(this)}>Remove all</button>
        <button onClick={this.removeTop.bind(this)}>Remove top</button>
        <button onClick={this.removeBottom.bind(this)}>Remove bottom</button>
        <button onClick={this.removeAll.bind(this)}>Remove randomly</button>
      </div>

      <List items={entries}/>
    </div>
  }
}

React.render(<App/>, document.body);