**WORK IN PROGRESS**

perpetually
===========

An efficient endless scrolling component for [React](https://facebook.github.io/react/).

TODO
----

* Test in more browsers (it's currently only tested in a recent desktop Chrome).
* Support scrolling containers other than `window`.
* Automated testing (mocking the browser, especially the scrolling part).
* Provide better documentation (including demo page).

Features
--------

* Hide DOM nodes that are not currently in view.
* Support variable height of list elements.
* Simple and intuitive component interface.

Installation
------------

`npm install --save perpetually`

Usage
-----

```javascript
import List from "perpetually";

// The items that should be shown
let items = [];

// Add some items
for (let i = 0; i < 100; i++) {
  items.push(<div key={i}>{i}</div>); // Key is required
}

// Render the list
React.render(<List>{items}</List>, document.body);
```

Parameters
----------
TODO

## Feedback ##

I appreciate any kind of feedback. Just create an issue or drop me a mail. Thanks!

## License ##

See [LICENSE](LICENSE).
