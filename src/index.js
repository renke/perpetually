import update from "react-addons-update";
import React, {Component} from "react";
import {times, flatten} from "lodash";
import {findDOMNode} from "react-dom";

const BATCH_SIZE = 10;
const FIRST_BATCH_SIZE = 4;

export default class Perpetually extends Component {
  static defaultProps = {
    numberOfColumns: 3,
  };

  constructor(props) {
    super(props);

    this.rects = new Map();

    const items = this.prepareChildren(this.props.children);

    this.state = {
      columns: this.initializeColumns(this.props.numberOfColumns, items),
    };
  }

  initializeColumns(numberOfColumns, items) {
    const columized = this.columnizeItems(numberOfColumns, items);

    const columns = times(numberOfColumns, i => {
      const items = columized[i];

      return {
        index: i,

        items,

        start: 0,
        end: Math.min(items.length, FIRST_BATCH_SIZE),

        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    });

    return columns;
  }

  columnizeItems(number, items) {
    const columnized = [];

    times(number, n => {
      columnized[n] = [];
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      columnized[i % number].push(item);
    }

    return columnized;
  }

  prepareChildren(children) {
    const rawItems = this.convertChildren(children);

    const items = rawItems.map((rawItem, i) => {
      const style = {
        outline: `1px solid ${["red", "blue", "green"][i % 3]}`,
        margin: 0,
        padding: 0,
        overflowY: "auto", // Avoid margin collapsing
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

    const oldItems = flatten(this.state.columns.map(column => column.items));
    const oldKeys = oldItems.map(item => item.key);

    const newKeysSet = new Set(newKeys);
    // const oldKeysSet = new Set(oldKeys);

    const removedKeys = oldKeys.filter(key => !newKeysSet.has(key));
    // const addedKeys = newKeys.filter(key => !oldKeysSet.has(key));

    for (const key of removedKeys) {
      this.rects.delete(key);
    }

    this.state.items = this.prepareChildren(newProps.children);

    // TODO: Check if number of columns changed

    if (newProps.numberOfColumns !== this.props.numberOfColumns) {
      console.log("numberOfColumns changed", "from", this.props.numberOfColumns, "to", newProps.numberOfColumns);
      this.state.columns = this.initializeColumns(newProps.numberOfColumns, this.state.items);
    } else {
      console.log("numberOfColumns not changed");
      times(this.props.numberOfColumns, i => {
        const columized = this.columnizeItems(this.props.numberOfColumns, this.state.items);
        const items = columized[i];
        this.state.columns[i].items = items;
      });
    }

    this.props = newProps;

    this.adjust();
  }

  update() {
    const {rects} = this;

    for (const column of this.state.columns) {
      const {items} = column;

      // Nothing to do.
      if (!items.length) {
        return;
      }

      const nodes = [...findDOMNode(this.refs[`column-${column.index}`]).children];

      nodes.forEach((node, index) => {
        const itemIndex = index + column.start;

        const relativeRect = node.getBoundingClientRect();

        const rect = {
          height: Math.round(relativeRect.height),
          top: Math.round(relativeRect.top + window.scrollY),
          bottom: Math.round(relativeRect.bottom + window.scrollY),
        };

        rects.set(items[itemIndex].key, rect);
      });

      // TODO
      // Adjust scroll to account for new items that appeared above the view
      // if (this.topJump) {
      //   for (let i = 0; i < this.topJump; i++) {
      //     const rect = this.rects.get(this.state.items[this.state.start + i].key);
      //     window.scrollBy(0, rect.height);
      //   }
      //
      //   this.topJump = 0;
      // }

      // Render additional items above the view and remember to scroll accordingly
      const {topDemand, start} = column;
      const {bottomDemand, end} = column;

      if (!topDemand && !bottomDemand) {
        // Nothing to do.
        continue;
      }

      // console.log("update()", "end", end, "bottomDemand", bottomDemand);

      // TODO: Merge all column setState calls

      if (topDemand) {
        const newState = update(this.state, {
          columns: {
            [column.index]: {
              $merge: {
                topDemand: 0,
                start: Math.max(0, start - topDemand),
              },
            },
          },
        });

        this.setState(newState, this.adjust);
      }

      // Render additional items below the view

      if (bottomDemand) {
        const newState = update(this.state, {
          columns: {
            [column.index]: {
              $merge: {
                bottomDemand: 0,
                end: Math.min(items.length, end + bottomDemand),
              },
            },
          },
        });

        this.setState(newState, this.adjust);
      }
    }
  }

  computeStartAndTopSpacerHeight(column) {
    const {items} = column;
    const {rects} = this;

    let topSpacerHeight = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rect = rects.get(item.key);

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

          const otherItem = items[testStart];

          if (!otherItem) {
            break;
          }

          const otherRect = rects.get(otherItem.key);

          if (!otherRect) {
            break;
          }

          newStart = testStart;
          topDemand--;

          topSpacerHeight -= otherRect.height;
        }

        topDemand = Math.min(newStart, topDemand);
        newStart = Math.max(0, newStart);

        const newStartItem = items[newStart];
        const newStartRect = rects.get(newStartItem.key);

        return {start: newStart, topDemand, topSpacerHeight};
      } else {
        topSpacerHeight += rect.height;
      }
    }

    return {start: 0, topSpacerHeight: 0};
  }

  computeEndAndBottomSpacerHeight(column) {
    const {rects} = this;
    const {items} = column;

    let bottomSpacerHeight = 0;

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const rect = rects.get(item.key);

      if (!rect) {
        continue;
      }

      if (rect.top - window.scrollY < Math.round($(window).height())) {
        const viewEnd = i;
        let newEnd = viewEnd;
        let bottomDemand = BATCH_SIZE;

        for (let j = 1; j <= BATCH_SIZE; j++) {
          const testEnd = viewEnd + j;

          const otherItem = items[testEnd];

          if (!otherItem) {
            break;
          }

          const otherRect = rects.get(otherItem.key);

          if (!otherRect) {
            break;
          }

          newEnd = testEnd;
          bottomDemand--;

          bottomSpacerHeight -= otherRect.height;
        }

        newEnd = Math.min(items.length, newEnd + 1);

        const distanceToBottom = items.length - newEnd;
        bottomDemand = Math.min(distanceToBottom, bottomDemand);

        return {end: newEnd, bottomDemand, bottomSpacerHeight};
      } else {
        bottomSpacerHeight += rect.height;
      }
    }

    return {end: 1, bottomDemand: Math.min(items.length, BATCH_SIZE), bottomSpacerHeight: 0};
  }

  componentDidMount() {
    this.update();

    window.addEventListener("scroll", this.handleScroll);
    window.addEventListener("resize", this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);
  }

  componentDidUpdate() {
    this.update();
  }

  handleResize = () => {
    this.adjust();
  };

  handleScroll = () => {
    console.log("scroll");
    this.adjust();
  };

  adjust() {
    const newColumns = [];

    for (const column of this.state.columns) {
      const {start, topDemand, topSpacerHeight} = this.computeStartAndTopSpacerHeight(column);
      const {end, bottomDemand, bottomSpacerHeight} = this.computeEndAndBottomSpacerHeight(column)

      const newColumn = {
        ...column,

        start,
        topDemand,
        topSpacerHeight,

        end,
        bottomDemand,
        bottomSpacerHeight,
      };

      newColumns[column.index] = newColumn;
    }

    this.setState({columns: newColumns});
  }

  render() {
    // console.group("render")
    // const shownItems = this.state.items.slice(this.state.start, this.state.end);

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

    const columnsContainers = this.state.columns.map(column => {
      const width = 100 / this.state.columns.length;
      const {items, start, end} = column;

      const visibleItems = items.slice(start, end);

      return <div key={column.index} style={{float: "left", width: `${width}%`}}>
        <div style={{height: `${column.topSpacerHeight || 0 }px`}}/>
        <div ref={`column-${column.index}`}>
          {visibleItems}
        </div>
        <div style={{height: `${column.bottomSpacerHeight || 0}px`}}/>
      </div>;
    });

    return (
      <div style={this.props.style}>
        <div style={topSpacerStyle}/>
        <div style={{clear: "both"}}>
          {columnsContainers}
        </div>
        <div style={bottomSpacerStyle}/>
      </div>
    );
  }
}
        // <div ref="itemsContainer">
        //   {[] || shownItems}
        // </div>
