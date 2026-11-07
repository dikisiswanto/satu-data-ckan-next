import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(
  "deploy/ckan/theme/ckanext/portal_theme/public/portal-admin-back-to-top.js",
  "utf8",
);
const listeners = new Map();
const buttonListeners = new Map();
let scheduledFrame = null;
let reducedMotion = false;
let scrollCall = null;
const button = {
  hidden: false,
  attributes: {},
  addEventListener(name, callback) {
    buttonListeners.set(name, callback);
  },
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
};
const document = {
  readyState: "complete",
  body: {
    appendChild(element) {
      this.child = element;
    },
  },
  querySelector(selector) {
    assert.equal(selector, ".portal-admin-shell");
    return {};
  },
  getElementById() {
    return null;
  },
  createElement(tag) {
    assert.equal(tag, "button");
    return button;
  },
};
const window = {
  scrollY: 0,
  matchMedia() {
    return { matches: reducedMotion };
  },
  scrollTo(options) {
    scrollCall = options;
  },
  requestAnimationFrame(callback) {
    scheduledFrame = callback;
    return 1;
  },
  addEventListener(name, callback) {
    listeners.set(name, callback);
  },
};

vm.runInNewContext(source, { document, window });
assert.equal(document.body.child, button);
assert.equal(button.type, "button");
assert.equal(button.attributes["aria-label"], "Kembali ke bagian atas halaman");
assert.equal(button.hidden, true, "control stays hidden near the page start");

window.scrollY = 800;
listeners.get("scroll")();
scheduledFrame();
assert.equal(
  button.hidden,
  false,
  "control appears after the scroll threshold",
);

buttonListeners.get("click")();
assert.equal(scrollCall.top, 0);
assert.equal(scrollCall.left, 0);
assert.equal(scrollCall.behavior, "smooth");

reducedMotion = true;
buttonListeners.get("click")();
assert.equal(
  scrollCall.behavior,
  "auto",
  "reduced motion disables smooth scrolling",
);

process.stdout.write(
  "CKAN back-to-top runtime test passed: visibility threshold, accessible name, scroll action, and reduced-motion behavior.\n",
);
