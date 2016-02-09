/*global describe, it*/
import {expect} from "chai";

import perpetually from "../src";

describe("perpetually", () => {
  it("should return foo", () => {
    expect(perpetually()).to.equal("foo");
  });
});
