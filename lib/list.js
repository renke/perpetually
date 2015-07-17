import $ from "jquery";
import React from "react/addons";

const BATCH_SIZE = 2;

class List extends React.Component {
  constructor(props) {
    super(props);

    this.rects = new Map();

    let items = this.convertChildren(this.props.children);

    this.state = {
      items: items,

      start: 0,
      end: Math.min(items.length, BATCH_SIZE),

      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
    };
  }

  convertChildren(children) {
    if (children.length === 0) {
      return []
    }

    if (children.length) {
      return children;
    } else {
      return [children];
    }
  }

  componentWillMount() {
    this.handleScroll();
  }

  componentWillReceiveProps(newProps) {
    let newItems = this.convertChildren(newProps.children);

    let newKeys = newItems.map(item => item.key);
    let oldKeys = this.state.items.map(item => item.key);

    let newKeysSet = new Set(newKeys);
    let oldKeysSet = new Set(oldKeys);

    let removedKeys = oldKeys.filter(key => !newKeysSet.has(key));
    let addedKeys = newKeys.filter(key => !oldKeysSet.has(key));

    for (let key of removedKeys) {
      this.rects.delete(key);
    }

    if (newItems.length < this.state.items.length) {
      // console.log("Fewer items");
    }

    this.state.items = this.convertChildren(newProps.children);
    this.props = newProps;

    this.handleScroll();
  }

  update() {
    if (!this.state.items.length) {
      return;
    }

    // Get position and size of rendered items
    let itemNodes = [].slice.call(React.findDOMNode(this.refs.itemsContainer).children);

    itemNodes.forEach((itemNode, i) => {
      let itemIndex = i + this.state.start;

      let relativeRect = itemNode.getBoundingClientRect();

      let rect = {}

      rect.height = Math.round(relativeRect.height);
      rect.top = Math.round(relativeRect.top + window.scrollY);
      rect.bottom = Math.round(relativeRect.bottom + window.scrollY);

      this.rects.set(this.state.items[itemIndex].key, rect);
    })

    // Adjust scroll to account for new items that appeared above the view
    if (this.topJump) {
      for (let i = 0; i < this.topJump; i++) {
        let rect = this.rects.get(this.state.items[this.state.start + i].key);
        window.scrollBy(0, rect.height);
      }

      this.topJump = 0;
    }

    // Render additional items above the view and remember to scroll accordingly
    if (this.topDemand) {
      console.log("topDemand", this.topDemand);
      this.topJump = this.topDemand;
      this.topDemand = 0;

      this.setState({start: Math.max(0, this.state.start - this.topJump)}, this.handleScroll);
    }

    // Render additional items below the view
    if (this.bottomDemand) {
      console.log("bottomDemand", this.bottomDemand);
      let bottomDemand = this.bottomDemand;
      this.bottomDemand = 0;
      this.setState({end: Math.min(this.state.items.length, this.state.end + bottomDemand)}, this.handleScroll);
    }
  }

  computeStartAndTopSpacerHeight() {
    let topSpacerHeight = 0;

    for (let i = 0; i < this.state.items.length; i++) {

      let item = this.state.items[i];
      let rect = this.rects.get(item.key);

      if (!rect) {
        continue;
      }

      if (rect.bottom - window.scrollY >= 0) {
        const viewStart = i;
        let newStart = viewStart;
        let topDemand = BATCH_SIZE;

        for (let j = 1; j <= BATCH_SIZE; j++) {
          let testStart = viewStart - j;

          let otherItem = this.state.items[testStart];

          if (!otherItem) {
            break;
          }

          let otherRect = this.rects.get(otherItem.key);

          if (!otherRect) {
            break;
          }

          newStart = testStart;
          topDemand--;

          topSpacerHeight -= otherRect.height;
        }

        topDemand = Math.min(newStart, topDemand);
        newStart = Math.max(0, newStart);

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
      let item = this.state.items[i];
      let rect = this.rects.get(item.key);

      if (!rect) {
        continue;
      }

      if (rect.top - window.scrollY <= Math.round($(window).height())) {
        const viewEnd = i;
        let newEnd = viewEnd;
        let bottomDemand = BATCH_SIZE;

        for (let j = 1; j <= BATCH_SIZE; j++) {
          let testEnd = viewEnd + j;

          let otherItem = this.state.items[testEnd];

          if (!otherItem) {
            break;
          }

          let otherRect = this.rects.get(otherItem.key);

          if (!otherRect) {
            break;
          }

          newEnd = testEnd;
          bottomDemand--;

          bottomSpacerHeight -= otherRect.height;
        }

        newEnd = Math.min(this.state.items.length, newEnd + 1);

        let distanceToBottom = this.state.items.length - newEnd;
        bottomDemand = Math.min(distanceToBottom, bottomDemand);

        console.log("distanceToBottom", distanceToBottom);

        return {end: newEnd, bottomDemand, bottomSpacerHeight};
      } else {
        bottomSpacerHeight += rect.height;
      }
    }

    console.log("Nothing was rendered yet.");
    console.log(this.state.items);
    return {end: 1, bottomDemand: Math.min(this.state.items.length, BATCH_SIZE), bottomSpacerHeight: 0};
  }

  componentDidMount() {
    this.update();

    // TODO Remove jquery dependency
    $(window).on("scroll", this.handleScroll.bind(this));
    $(window).on("resize", this.handleScroll.bind(this));
  }

  componentDidUnmount() {
    $(window).off("scroll", this.handleScroll.bind(this));
    $(window).on("resize", this.handleScroll.bind(this));
  }

  componentDidUpdate() {
    this.update();
  }

  handleScroll() {
    let {start, topDemand, topSpacerHeight} = this.computeStartAndTopSpacerHeight()
    let {end, bottomDemand, bottomSpacerHeight} = this.computeEndAndBottomSpacerHeight();

    this.bottomDemand = bottomDemand;
    this.topDemand = topDemand;

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
    let shownItems = this.state.items.slice(this.state.start, this.state.end);

    // console.groupEnd("render")
    let topSpacerStyle = Object.assign(
      {
        height: `${this.state.topSpacerHeight}px`
      },
      this.props.topSpacerStyle || {},
    );

    let bottomSpacerStyle = Object.assign(
      {
        height: `${this.state.bottomSpacerHeight}px`
      },
      this.props.bottomSpacerStyle || {},
    );

    return (
      <div style={this.props.style} id={this.props.id}>
        <div ref="topSpacer" style={topSpacerStyle}/>
        <div ref="itemsContainer">
          {shownItems}
        </div>
        <div ref="bottomSpacer" style={bottomSpacerStyle}/>
      </div>
    )
  }
}

export default List;
