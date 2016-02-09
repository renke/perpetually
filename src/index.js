import $ from "jquery";
import React, {Component} from "react";
import {findDOMNode} from "react-dom";

const BATCH_SIZE = 10;
const FIRST_BATCH_SIZE = 4;

export default class Perpetually extends Component {
  constructor(props) {
    super(props);

    this.rects = new Map();

    const items = this.prepareChildren(this.props.children);

    // TODO
    // columns[n] = {
    //   start, end, topSpacerHeight, bottomSpacerHeight,
    // }

    this.state = {
      items: items,

      start: 0,
      end: Math.min(items.length, FIRST_BATCH_SIZE),

      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
    };
  }

  prepareChildren(children) {
    const rawItems = this.convertChildren(children);

    const items = rawItems.map(rawItem => {

      const style = {
        outline: "1px solid black",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      };

      return <div key={rawItem.key} style={style}>
        {rawItem}
      </div>;
    });

    return items;
  }

  // Convert React-style children to an actual array
  convertChildren(children) {
    if (children.length === 0) {
      return [];
    }

    if (children.length) {
      return children;
    } else {
      return [children];
    }
  }

  componentWillMount() {
    this.adjust();
  }

  componentWillReceiveProps(newProps) {
    const newItems = this.prepareChildren(newProps.children);

    const newKeys = newItems.map(item => item.key);
    const oldKeys = this.state.items.map(item => item.key);

    const newKeysSet = new Set(newKeys);
    // const oldKeysSet = new Set(oldKeys);

    const removedKeys = oldKeys.filter(key => !newKeysSet.has(key));
    // const addedKeys = newKeys.filter(key => !oldKeysSet.has(key));

    for (const key of removedKeys) {
      this.rects.delete(key);
    }

    this.state.items = this.prepareChildren(newProps.children);
    this.props = newProps;

    this.adjust();
  }

  update() {
    if (!this.state.items.length) {
      return;
    }

    // Get position and size of rendered items

    // TODO: For each column
    const itemNodes = [...findDOMNode(this.refs.itemsContainer).children];

    itemNodes.forEach((itemNode, i) => {
      const itemIndex = i + this.state.start;

      const relativeRect = itemNode.getBoundingClientRect();

      const rect = {};

      rect.height = Math.round(relativeRect.height);
      rect.top = Math.round(relativeRect.top + window.scrollY);
      rect.bottom = Math.round(relativeRect.bottom + window.scrollY);

      this.rects.set(this.state.items[itemIndex].key, rect);
    });

    // Adjust scroll to account for new items that appeared above the view
    if (this.topJump) {
      for (let i = 0; i < this.topJump; i++) {
        const rect = this.rects.get(this.state.items[this.state.start + i].key);
        window.scrollBy(0, rect.height);
      }

      this.topJump = 0;
    }

    // Render additional items above the view and remember to scroll accordingly
    if (this.topDemand) {
      this.topJump = this.topDemand;
      this.topDemand = 0;

      this.setState({start: Math.max(0, this.state.start - this.topJump)}, this.adjust);
    }

    // Render additional items below the view
    if (this.bottomDemand) {
      const bottomDemand = this.bottomDemand;
      this.bottomDemand = 0;
      this.setState({end: Math.min(this.state.items.length, this.state.end + bottomDemand)}, this.adjust);
    }
  }

  computeStartAndTopSpacerHeight() {
    // TODO: For each column

    let topSpacerHeight = 0;

    for (let i = 0; i < this.state.items.length; i++) {
      const item = this.state.items[i];
      const rect = this.rects.get(item.key);

      // This item has never been rendered, so we know nothing about its height
      // We just give it a height of 0 (implictly).
      if (!rect) {
        continue;
      }

      // TODO: >= vs ===?
      if (rect.bottom - window.scrollY >= 0) {
        const viewStart = i;

        let newStart = viewStart;
        let topDemand = BATCH_SIZE;

        for (let j = 1; j <= BATCH_SIZE; j++) {
          const testStart = viewStart - j;

          const otherItem = this.state.items[testStart];

          if (!otherItem) {
            break;
          }

          const otherRect = this.rects.get(otherItem.key);

          if (!otherRect) {
            break;
          }

          newStart = testStart;
          topDemand--;

          topSpacerHeight -= otherRect.height;
        }

        topDemand = Math.min(newStart, topDemand);
        newStart = Math.max(0, newStart);

        const newStartItem = this.state.items[newStart];
        const newStartRect = this.rects.get(newStartItem.key);

        return {start: newStart, topDemand, topSpacerHeight};
      } else {
        topSpacerHeight += rect.height;
      }
    }

    return {start: 0, topSpacerHeight: 0};
  }

  computeEndAndBottomSpacerHeight() {
    let bottomSpacerHeight = 0;

    for (let i = this.state.items.length - 1; i >= 0; i--) {
      const item = this.state.items[i];
      const rect = this.rects.get(item.key);

      if (!rect) {
        continue;
      }

      if (rect.top - window.scrollY <= Math.round($(window).height())) {
        const viewEnd = i;
        let newEnd = viewEnd;
        let bottomDemand = BATCH_SIZE;

        for (let j = 1; j <= BATCH_SIZE; j++) {
          const testEnd = viewEnd + j;

          const otherItem = this.state.items[testEnd];

          if (!otherItem) {
            break;
          }

          const otherRect = this.rects.get(otherItem.key);

          if (!otherRect) {
            break;
          }

          newEnd = testEnd;
          bottomDemand--;

          bottomSpacerHeight -= otherRect.height;
        }

        newEnd = Math.min(this.state.items.length, newEnd + 1);

        const distanceToBottom = this.state.items.length - newEnd;
        bottomDemand = Math.min(distanceToBottom, bottomDemand);

        return {end: newEnd, bottomDemand, bottomSpacerHeight};
      } else {
        bottomSpacerHeight += rect.height;
      }
    }

    return {end: 1, bottomDemand: Math.min(this.state.items.length, BATCH_SIZE), bottomSpacerHeight: 0};
  }

  componentDidMount() {
    this.update();

    // TODO Remove jquery dependency
    $(window).on("scroll", this.handleScroll.bind(this));
    $(window).on("resize", this.handleResize.bind(this));
  }

  componentWillUnmount() {
    $(window).off("scroll", this.handleScroll.bind(this));
    $(window).on("resize", this.handleResize.bind(this));
  }

  componentDidUpdate() {
    this.update();
  }

  handleResize() {
    this.adjust();
  }

  handleScroll() {
    this.adjust();
  }

  adjust() {
    const {start, topDemand, topSpacerHeight} = this.computeStartAndTopSpacerHeight();
    const {end, bottomDemand, bottomSpacerHeight} = this.computeEndAndBottomSpacerHeight();

    this.bottomDemand = bottomDemand;
    this.topDemand = topDemand;

    this.setState({
      start,
      end,
      topSpacerHeight,
      bottomSpacerHeight,
    });
  }

  render() {
    // console.group("render")
    const shownItems = this.state.items.slice(this.state.start, this.state.end);

    // console.groupEnd("render")
    const topSpacerStyle = Object.assign(
      {
        height: `${this.state.topSpacerHeight}px`,
      },
      this.props.topSpacerStyle || {},
    );

    const bottomSpacerStyle = Object.assign(
      {
        height: `${this.state.bottomSpacerHeight}px`,
      },
      this.props.bottomSpacerStyle || {},
    );

    return (
      <div style={this.props.style}>
        <div style={topSpacerStyle}/>
        <div ref="itemsContainer">
          {shownItems}
        </div>
        <div style={bottomSpacerStyle}/>
      </div>
    );
  }
}
