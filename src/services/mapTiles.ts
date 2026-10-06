import type { TileLayerOptions } from "leaflet";

export const MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_OPTIONS: TileLayerOptions = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  minZoom: 2,
  // OSM requires a real Referer; send the page origin without its path or query.
  referrerPolicy: "strict-origin-when-cross-origin",
};
