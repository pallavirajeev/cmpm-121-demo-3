import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";

// import board and cell interfaces for part b
import { Board } from "./board";
import { Cell } from "./board";

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

// // geocahche interface
// interface Geocache {
//   // an array of geocoins in the geocache
//   coins: Geocoin[];
// }

// geocache with empty array of geocoins
// const geocoinList: Geocache = { coins: [] };

const geocoinList: Geocoin[] = [];

// to convert a geocache into a string
function geocoinListStr(geocoinList: Geocoin[]) {
  let listStr = "";
  for (const geocoin of geocoinList) {
    listStr += `${geocoin.mintingLocation.i}:${geocoin.mintingLocation.j}#${geocoin.serialNumber}`;
    listStr += " ";
  }
  return listStr;
}

class Geocache {
  coins: Geocoin[];
  description: string;

  constructor(cell: Cell) {
    const A = ["fortunate", "ominous", "whimsical", "excellent"];
    const B = ["container", "box", "vault", "receptacle", "platform", "pot"];

    const selectedA =
      A[Math.floor(luck(["descA", cell.i, cell.j].toString()) * A.length)];
    const selectedB =
      B[Math.floor(luck(["descB", cell.i, cell.j].toString()) * B.length)];
    this.description = `${selectedA} ${selectedB}`;

    const numInitialCoins = Math.floor(
      luck(["intialCoins", cell.i, cell.j].toString()) * 3
    );
    this.coins = [];
    for (let i = 0; i < numInitialCoins; i++) {
      this.coins.push({ mintingLocation: cell, serialNumber: i });
    }
  }

  toMomento(): string {
    return JSON.stringify(this.coins);
  }

  fromMomento(momento: string) {
    this.coins = JSON.parse(momento) as Geocoin[];
  }
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
      "&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
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
    regenerateCells();
    coordinates = [
      leaflet.latLng(position.coords.latitude, position.coords.longitude),
    ];
    polyline.setLatLngs(coordinates);
  });
});
//let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No geocoins yet...";

// no longer rely on Merrill Classroom!!

// const geocachePopup = new Map<Cell, Geocoin[]>();
const geocachePopup = new Map<Cell, string>();
const geocacheList: leaflet.Rectangle[] = [];

let coordinates: leaflet.LatLng[] = [];
coordinates.push(playerMarker.getLatLng());
const polyline = leaflet.polyline(coordinates, { color: "red" }).addTo(map);

//loadLocal();
map.setView(playerMarker.getLatLng());

regenerateCells();

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
  const newGeocacheCell = new Geocache(geocacheCell);
  if (geocachePopup.has(geocacheCell)) {
    newGeocacheCell.fromMomento(geocachePopup.get(geocacheCell)!);
  } else {
    geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());
  }
  const geocache = leaflet.rectangle(board.getCellBounds(geocacheCell));

  // const cellList: Geocache = { coins: [] };
  // geocachePopup.set(geocacheCell, cellList.coins);
  const cellList: Geocoin[] = [];
  geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());

  geocache.bindPopup(() => {
    const value = Math.floor(luck([i, j, "initialValue"].toString()) * 10);
    for (let s = 0; s < value; s++) {
      // if (cellList.coins[s]?.serialNumber != s) {
      //   cellList.coins.push({
      if (cellList[s]?.serialNumber != s) {
        cellList.push({
          mintingLocation: geocacheCell,
          serialNumber: s,
        });
      }
    }

    const container = document.createElement("div");
    // <div>There is a pit here at "${i},${j}". It has value <span id="value">${value}</span>.</div>
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}", contains: <span id="value">${geocoinListStr(
      //cellList
      newGeocacheCell.coins
    )}</span></div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>`;

    // const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    // poke.addEventListener("click", () => {
    //   if (value > 0) {
    //     value--;
    //     //map1.set(s, value);
    //     //geocoinList.coins.push(cellList.coins.pop()!);
    //     geocoinList.push(newGeocacheCell.coins.pop()!);
    //     // console.log(" "+ map1.get(s));
    //     container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
    //       //   value.toString();
    //       // points++;
    //       // statusPanel.innerHTML = `${points} points accumulated`;

    //       //geocoinListStr(cellList);
    //       (geocoinListStr(newGeocacheCell.coins));
    //     points++;

    //     //statusPanel.innerHTML = `Geocoins: ${points}`;
    //     geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());
    //     statusPanel.innerHTML = `Geocoins: ${geocoinList.length}`;
    //   }
    // });
    
    //const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    // poke.addEventListener("click", () => {
    //   if (value > 0 && newGeocacheCell.coins.length > 0) {
    //     value--;
    //     const poppedCoin = newGeocacheCell.coins.pop();
    //     if (poppedCoin) {
    //       geocoinList.push(poppedCoin);
    //       container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
    //         geocoinListStr(newGeocacheCell.coins);
    //       points++;
    //       geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());
    //       statusPanel.innerHTML = `Geocoins: ${geocoinList.length}`;
    //     }
    //   }
    // });
    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      if (newGeocacheCell.coins.length > 0) {
          geocoinList.push(newGeocacheCell.coins.pop()!);
          container.querySelector<HTMLSpanElement>("#value")!.innerHTML = (geocoinListStr(newGeocacheCell.coins));
          geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());
          statusPanel.innerHTML = `Geocoins: ${geocoinList.length}`;
      }
  });

    //add code for the deposit
    // const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    // deposit.addEventListener("click", () => {
    //   const zero = 0;
    //   if (geocoinList.length == zero) {
    //     return;
    //     // points--;
    //     // value++;
    //     // map1.set(s, value);
    //     // container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
    //     //   value.toString();
    //     // statusPanel.innerHTML =
    //     //   points == zero ? `No points yet...` : `${points} points accumulated`;
    //   }
    //   // cellList.coins.push(geocoinList.coins.pop()!);
    //   // container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
    //   //   geocoinListStr(cellList);
    //   newGeocacheCell.coins.push(geocoinList.pop()!);
    //   container.querySelector<HTMLSpanElement>("#value")!.innerHTML = (geocoinListStr(newGeocacheCell.coins));
    //   geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());
    //   if (points == 0) {
    //     statusPanel.innerHTML = "No geocoins yet...";
    //   } else {
    //     points--;
    //     statusPanel.innerHTML = `Geocoins: ${points}`;
    //   }
    // });

    // const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    // deposit.addEventListener("click", () => {
    //   //const zero = 0;
    //   if (geocoinList.length > 0) {
    //     newGeocacheCell.coins.push(geocoinList.pop()!);
    //     container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
    //       geocoinListStr(newGeocacheCell.coins);
    //     geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());
    //     if (points == 0) {
    //       statusPanel.innerHTML = "No geocoins yet...";
    //     } else {
    //       points--;
    //       statusPanel.innerHTML = `Geocoins: ${points}`;
    //     }
    //   }
    // });

    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
        deposit.addEventListener("click", () => {
            if (geocoinList.length == 0) {
                return;
            }
            newGeocacheCell.coins.push(geocoinList.pop()!);
            container.querySelector<HTMLSpanElement>("#value")!.innerHTML = (geocoinListStr(newGeocacheCell.coins));
            geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());
            statusPanel.innerHTML = `Geocoins: ${geocoinList.length}`;
        });

    return container;
  });
  geocache.addTo(map);
  geocacheList.push(geocache);
}

// working on part c
// need to make the buttons work for player movement
// need to be able to clear and regenerate new cells since now the player can move
// need to apply memento pattern

// turn this into function for regenerating cells

// for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
//   for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
//     // if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
//     //   makePit(i, j);
//     // }
//     if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
//       makeGeocache(
//         i + Math.floor(MERRILL_CLASSROOM.lat / TILE_DEGREES),
//         j + Math.floor(MERRILL_CLASSROOM.lng / TILE_DEGREES)
//       );
//     }
//   }
// }
function regenerateCells() {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      const playerLat =
        i + Math.floor(playerMarker.getLatLng().lat / TILE_DEGREES);
      const playerLng =
        j + Math.floor(playerMarker.getLatLng().lng / TILE_DEGREES);
      if (luck([playerLat, playerLng].toString()) < PIT_SPAWN_PROBABILITY) {
        makeGeocache(playerLat, playerLng);
      }
    }
  }
}

// make a function to be able clear the geocaches
function clearGeocaches() {
  for (const geocache of geocacheList) {
    geocache.remove();
  }
}

function movePlayer(i: number, j: number) {
  playerMarker.setLatLng(
    leaflet.latLng(
      playerMarker.getLatLng().lat + i * TILE_DEGREES,
      playerMarker.getLatLng().lng + j * TILE_DEGREES
    )
  );
  map.setView(playerMarker.getLatLng());
  clearGeocaches();
  regenerateCells();
  //for part d
  coordinates.push(playerMarker.getLatLng());
  polyline.setLatLngs(coordinates);
}

const northButton = document.querySelector("#north")!;
northButton.addEventListener("click", () => movePlayer(1, 0));

const southButton = document.querySelector("#south")!;
southButton.addEventListener("click", () => movePlayer(-1, 0));

const westButton = document.querySelector("#west")!;
westButton.addEventListener("click", () => movePlayer(0, -1));

const eastButton = document.querySelector("#east")!;
eastButton.addEventListener("click", () => movePlayer(0, 1));
