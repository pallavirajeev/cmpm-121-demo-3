import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";

// import board and cell interfaces for part b
import { Board } from "./board.ts";
import { Cell } from "./board.ts";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});
// for part b we are getting rid of using Merrill Classroom
// we must apply the flyweight pattern
// we must also create something for "coins"
// change from pits and seeds to geocaches and geocoins ?

// geocoin interface
interface Geocoin {
  mintingLocation: Cell;
  serialNumber: number;
}

// geocahche interface
interface Geocache {
  // an array of geocoins in the geocache
  coins: Geocoin[];
}

// geocache with empty array of geocoins
const geocoinList: Geocache = { coins: [] };

// to convert a geocache into a string
function geocoinListStr(geocoinList: Geocache) {
  let listStr = "";
  for (const geocoin of geocoinList.coins) {
    listStr += `${geocoin.mintingLocation.i}:${geocoin.mintingLocation.j}#${geocoin.serialNumber}`;
    listStr += " ";
  }
  return listStr;
}

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

// new board
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);
const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    map.setView(playerMarker.getLatLng());
  });
});
let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No geocoins yet...";

// no longer rely on Merrill Classroom!!

const geocachePopup = new Map<Cell, Geocoin[]>();
function makeGeocache(i: number, j: number) {
  // const bounds = leaflet.latLngBounds([
  //   [
  //     MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
  //     MERRILL_CLASSROOM.lng + j * TILE_DEGREES,
  //   ],
  //   [
  //     MERRILL_CLASSROOM.lat + (i + 1) * TILE_DEGREES,
  //     MERRILL_CLASSROOM.lng + (j + 1) * TILE_DEGREES,
  //   ],
  // ]);

  // const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  // const map1 = new Map<string, number>();

  // pit.bindPopup(() => {
  //   let value = -1;
  //   const s = "[" + i + "," + j + "]";
  //   const foo = map1.get(s);
  //   console.log(foo);
  //   if (foo == null) {
  //     map1.set(s, Math.floor(luck([i, j, "initialValue"].toString()) * 100));
  //   }
  //   value = map1.get(s)!;
  const geocacheCell = board.getCellForPoint(
    leaflet.latLng({ lat: i, lng: j })
  );
  const geocache = leaflet.rectangle(board.getCellBounds(geocacheCell));

  const cellList: Geocache = { coins: [] };
  geocachePopup.set(geocacheCell, cellList.coins);

  geocache.bindPopup(() => {
    let value = Math.floor(luck([i, j, "initialValue"].toString()) * 10);
    for (let s = 0; s < value; s++) {
      if (cellList.coins[s]?.serialNumber != s) {
        cellList.coins.push({
          mintingLocation: geocacheCell,
          serialNumber: s,
        });
      }
    }

    const container = document.createElement("div");
    // <div>There is a pit here at "${i},${j}". It has value <span id="value">${value}</span>.</div>
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}", contains: <span id="value">${geocoinListStr(
      cellList
    )}</span></div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>`;
    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      if (value > 0) {
        value--;
        //map1.set(s, value);
        geocoinList.coins.push(cellList.coins.pop()!);
        // console.log(" "+ map1.get(s));
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          //   value.toString();
          // points++;
          // statusPanel.innerHTML = `${points} points accumulated`;
          geocoinListStr(cellList);
        points++;
        statusPanel.innerHTML = `Geocoins: ${points}`;
      }
    });
    //add code for the deposit
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      const zero = 0;
      if (geocoinList.coins.length == zero) {
        return;
        // points--;
        // value++;
        // map1.set(s, value);
        // container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        //   value.toString();
        // statusPanel.innerHTML =
        //   points == zero ? `No points yet...` : `${points} points accumulated`;
      }
      cellList.coins.push(geocoinList.coins.pop()!);
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        geocoinListStr(cellList);
      if (points == 0) {
        statusPanel.innerHTML = "No geocoins yet...";
      } else {
        points--;
        statusPanel.innerHTML = `Geocoins: ${points}`;
      }
    });
    return container;
  });
  geocache.addTo(map);
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
    //   makePit(i, j);
    // }
    if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
      makeGeocache(
        i + Math.floor(MERRILL_CLASSROOM.lat / TILE_DEGREES),
        j + Math.floor(MERRILL_CLASSROOM.lng / TILE_DEGREES)
      );
    }
  }
}
