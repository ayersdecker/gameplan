const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const React = require("react");
const ts = require("typescript");

function hooks() {
  const values = [];
  const effects = [];
  let index = 0;
  return {
    react: {
      ...React,
      useState(initial) {
        const slot = index++;
        if (!(slot in values)) values[slot] = initial;
        return [values[slot], (value) => { values[slot] = value; }];
      },
      useRef(initial) {
        const slot = index++;
        if (!(slot in values)) values[slot] = { current: initial };
        return values[slot];
      },
      useEffect(callback, deps) {
        const slot = index++;
        const previous = values[slot];
        if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) {
          effects.push(() => {
            previous?.cleanup?.();
            values[slot] = { deps, cleanup: callback() };
          });
        }
      },
    },
    render(component, props) {
      index = 0;
      return component(props);
    },
    flush() {
      effects.splice(0).forEach((effect) => effect());
    },
    cleanup() {
      values.forEach((value) => value?.cleanup?.());
    },
  };
}

const native = {
  View: "view",
  Text: "text",
  TextInput: "input",
  TouchableOpacity: "button",
  StyleSheet: { create: (styles) => styles },
  Platform: { OS: "web", select: (choices) => choices.web },
};

function load(file, imports, globals = {}) {
  const filename = path.resolve(__dirname, "..", file);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (id) => {
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
    console: { error() {}, warn() {} },
    window: { addEventListener() {}, removeEventListener() {} },
    document: { addEventListener() {}, removeEventListener() {} },
    setTimeout: (callback) => callback(),
    ...globals,
  }, { filename });
  return module.exports;
}

function find(element, predicate) {
  if (!React.isValidElement(element)) return null;
  if (predicate(element)) return element;
  for (const child of React.Children.toArray(element.props.children)) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

test("missing Firebase configuration offers an explicit map preview without Auth", () => {
  const h = hooks();
  const MapTab = () => null;
  const AuthProvider = () => null;
  const Root = load("app/_layout.tsx", {
    react: h.react,
    "react-native": native,
    "expo-router": { Stack: () => null },
    "expo-font": { useFonts: () => [true] },
    "@expo-google-fonts/inter": {},
    "../src/hooks/useAuth": { AuthProvider },
    "../src/services/firebase": { isFirebaseConfigured: () => false },
    "./(tabs)/map": { __esModule: true, default: MapTab },
    "../src/styles/leaflet": {},
  }).default;

  const setup = h.render(Root);
  assert.equal(find(setup, (el) => el.type === AuthProvider), null);
  assert.equal(find(setup, (el) => el.type === MapTab), null);
  find(setup, (el) => el.type === "button").props.onPress();
  const preview = h.render(Root);
  assert.ok(find(preview, (el) => el.type === MapTab));
  assert.equal(find(preview, (el) => el.type === AuthProvider), null);
  find(preview, (el) => el.type === "button").props.onPress();
  assert.equal(find(h.render(Root), (el) => el.type === MapTab), null);
});

test("configured app still renders the authenticated navigator", () => {
  const h = hooks();
  const AuthProvider = () => null;
  const Stack = () => null;
  Stack.Screen = () => null;
  const Root = load("app/_layout.tsx", {
    react: h.react,
    "react-native": native,
    "expo-router": { Stack },
    "expo-font": { useFonts: () => [true] },
    "@expo-google-fonts/inter": {},
    "../src/hooks/useAuth": { AuthProvider },
    "../src/services/firebase": { isFirebaseConfigured: () => true },
    "./(tabs)/map": { __esModule: true, default: () => null },
    "../src/styles/leaflet": {},
  }).default;
  const tree = h.render(Root);
  assert.ok(find(tree, (el) => el.type === AuthProvider));
  assert.ok(find(tree, (el) => el.type === Stack));
});

for (const configured of [false, true]) {
  test(`map renders without location while Firebase is ${configured ? "configured" : "missing"}`, () => {
    const h = hooks();
    const Map = () => null;
    let subscriptions = 0;
    let reportError;
    const MapTab = load("app/(tabs)/map.tsx", {
      react: h.react,
      "react-native": native,
      "firebase/firestore": {
        collection: () => ({}),
        query: () => ({}),
        orderBy: () => ({}),
        limit: () => ({}),
        onSnapshot: (_query, _success, failure) => {
          subscriptions++;
          reportError = failure;
          return () => {};
        },
      },
      "../../src/services/firebase": { db: {}, isFirebaseConfigured: () => configured },
      "expo-router": { useRouter: () => ({ push() {} }) },
      "../../src/hooks/useLocation": {
        useLocation: () => ({
          location: null,
          loading: false,
          error: "Location permission denied",
          getCurrentLocation: async () => null,
          getDistance: () => 0,
        }),
      },
      "../../src/components/LeafletMapEnhanced": { default: Map },
    }).default;
    let tree = h.render(MapTab);
    assert.ok(find(tree, (el) => el.type === Map), "map must not wait for activity data");
    assert.equal(find(tree, (el) => el.type === Map).props.userLocation, null);
    h.flush();
    assert.equal(subscriptions, configured ? 1 : 0);
    if (configured) reportError(new Error("Firestore unavailable"));
    tree = h.render(MapTab);
    assert.ok(find(tree, (el) => el.type === Map), "map survives activity loading errors");
    assert.ok(find(tree, (el) => el.props.children === "Location permission denied"));
    if (configured) {
      assert.ok(find(tree, (el) => el.props.accessibilityRole === "alert"));
    }
    h.cleanup();
  });
}

test("Leaflet loads keyless OpenStreetMap tiles with attribution and reports tile failures", async () => {
  const h = hooks();
  const tilesConfig = load("src/services/mapTiles.ts", {});
  const events = {};
  const windowEvents = {};
  const views = [];
  let removed = false;
  let resized = false;
  const map = {
    setView: (coordinates, zoom) => {
      views.push({ coordinates: Array.from(coordinates), zoom });
      return map;
    },
    invalidateSize: () => { resized = true; },
    remove: () => { removed = true; },
  };
  const leaflet = {
    map: (_container, options) => {
      assert.equal(options.attributionControl, true);
      assert.equal(options.zoomControl, true);
      return map;
    },
    tileLayer: (url, options) => {
      assert.equal(url, "https://tile.openstreetmap.org/{z}/{x}/{y}.png");
      assert.match(options.attribution, /openstreetmap.org\/copyright/);
      assert.equal(options.maxZoom, 19);
      assert.equal(options.referrerPolicy, "strict-origin-when-cross-origin");
      return {
        on(name, handler) { events[name] = handler; },
        addTo: () => {},
      };
    },
    control: () => ({ addTo() {} }),
    divIcon: () => ({}),
    marker: () => ({ bindPopup() {}, addTo() {} }),
  };
  const Map = load("src/components/LeafletMapEnhanced.tsx", {
    react: h.react,
    "react-native": native,
    "../services/mapTiles": tilesConfig,
    leaflet,
  }, {
    window: {
      addEventListener: (name, handler) => { windowEvents[name] = handler; },
      removeEventListener: (name) => { delete windowEvents[name]; },
    },
  }).default;
  const props = { activities: [], userLocation: null };
  let tree = h.render(Map, props);
  find(tree, (el) => el.type === "div").props.ref.current = { querySelector: () => null };
  h.flush();
  await new Promise((resolve) => setImmediate(resolve));
  h.render(Map, props);
  h.flush();
  assert.ok(events.tileerror, "tile layer must initialize without location");
  assert.deepEqual(views[0], { coordinates: [20, 0], zoom: 2 });
  assert.equal(resized, true, "map must resize after Leaflet finishes loading");
  events.tileerror(new Error("Tile unavailable"));
  tree = h.render(Map, props);
  assert.ok(find(tree, (el) => el.props.accessibilityRole === "alert"));
  events.load();
  assert.ok(find(h.render(Map, props), (el) => el.props.accessibilityRole === "alert"),
    "failed tile loading must not clear the error");
  find(tree, (el) => el.type === "div").props.ref.current.querySelector = () => ({});
  events.load();
  assert.equal(find(h.render(Map, props), (el) => el.props.accessibilityRole === "alert"), null);
  h.render(Map, { ...props, userLocation: { latitude: 51.5, longitude: -0.12 } });
  h.flush();
  windowEvents.locateUser();
  assert.deepEqual(views.at(-1), { coordinates: [51.5, -0.12], zoom: 15 },
    "locate control must use a location received after map initialization");
  h.cleanup();
  assert.equal(removed, true);
  assert.equal(windowEvents.locateUser, undefined);
});

test("Leaflet import failure displays an error rather than a blank map", async () => {
  const h = hooks();
  const imports = {
    react: h.react,
    "react-native": native,
    "../services/mapTiles": load("src/services/mapTiles.ts", {}),
  };
  Object.defineProperty(imports, "leaflet", {
    get() { throw new Error("Leaflet import unavailable"); },
  });
  const Map = load("src/components/LeafletMapEnhanced.tsx", imports).default;
  const props = { activities: [], userLocation: null };
  h.render(Map, props);
  h.flush();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(find(h.render(Map, props), (el) => el.props.accessibilityRole === "alert"));
  h.cleanup();
});
