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
let geocoinList: Geocoin[] = [];

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

  // constructor to initialize a new Geocache instance
  constructor(cell: Cell) {
    // arrays of adjectives and nouns for creating random descriptions
    const A = ["fortunate", "ominous", "whimsical", "excellent"];
    const B = ["container", "box", "vault", "receptacle", "platform", "pot"];

    // select a random adjective and noun for the description
    const selectedA =
      A[Math.floor(luck(["descA", cell.i, cell.j].toString()) * A.length)];
    const selectedB =
      B[Math.floor(luck(["descB", cell.i, cell.j].toString()) * B.length)];
    // combine the selected words to form the description
    this.description = `${selectedA} ${selectedB}`;

    // use luck to determine the number of initial coins
    const numInitialCoins = Math.floor(
      luck(["intialCoins", cell.i, cell.j].toString()) * 3
    );
    // initialize the coins array with randomly generated Geocoin objects
    this.coins = [];
    for (let i = 0; i < numInitialCoins; i++) {
      // each Geocoin has a minting location (cell) and a serial number
      this.coins.push({ mintingLocation: cell, serialNumber: i });
    }
  }

  // convert the Geocache state (coins) to a JSON string for saving
  toMomento(): string {
    return JSON.stringify(this.coins);
  }
  // restore the Geocache state (coins) from a JSON string
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
//statusPanel.innerHTML = "No geocoins yet...";
statusPanel.innerHTML = `Geocoins: ${geocoinList.length}`;

let geocachePopup = new Map<Cell, string>();
const geocacheList: leaflet.Rectangle[] = [];

let coordinates: leaflet.LatLng[] = [];
coordinates.push(playerMarker.getLatLng());
const polyline = leaflet.polyline(coordinates, { color: "red" }).addTo(map);

map.setView(playerMarker.getLatLng());

loadLocal();
regenerateCells();

function makeGeocache(i: number, j: number) {
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
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}", contains: <span id="value">${geocoinListStr(
      //cellList
      newGeocacheCell.coins
    )}</span></div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>`;
    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    poke.addEventListener("click", () => {
      if (newGeocacheCell.coins.length > 0) {
        geocoinList.push(newGeocacheCell.coins.pop()!);
        container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          geocoinListStr(newGeocacheCell.coins);
        geocachePopup.set(geocacheCell, newGeocacheCell.toMomento());
        statusPanel.innerHTML = `Geocoins: ${geocoinList.length}`;
      }
    });

    //add code for the deposit
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;
    deposit.addEventListener("click", () => {
      if (geocoinList.length == 0) {
        return;
      }
      newGeocacheCell.coins.push(geocoinList.pop()!);
      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        geocoinListStr(newGeocacheCell.coins);
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

//function for player movement
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

// the different buttons for moving up, down, left, right
const northButton = document.querySelector("#north")!;
northButton.addEventListener("click", () => movePlayer(1, 0));

const southButton = document.querySelector("#south")!;
southButton.addEventListener("click", () => movePlayer(-1, 0));

const westButton = document.querySelector("#west")!;
westButton.addEventListener("click", () => movePlayer(0, -1));

const eastButton = document.querySelector("#east")!;
eastButton.addEventListener("click", () => movePlayer(0, 1));

// reset button
const resetButton = document.querySelector("#reset")!;
resetButton.addEventListener("click", () => {
  //suggested to add a prompt before resetting
  const resetPrompt = prompt("Reset game state? (Yes / No)")!;
  if (resetPrompt.toLowerCase() == "yes") {
    geocoinList.length = 0;
    statusPanel.innerHTML = `Geocoins: ${geocoinList.length}`;
    for (const geocache of geocacheList) {
      geocache.remove();
    }
    geocacheList.length = 0;
    coordinates.length = 0;
    geocachePopup.clear();
    playerMarker.setLatLng(MERRILL_CLASSROOM);
    polyline.setLatLngs(coordinates);
    map.setView(playerMarker.getLatLng());
    regenerateCells();
  }
});

// working on persistent data storage

// first define a structure to save data
interface Data {
  geocoinListData: Geocoin[];
  geocachePopupData: [Cell, string][];
  playerLocationData: leaflet.LatLng;
  coordinateData: leaflet.LatLng[];
}

// define a function to save game data to local storage
function saveLocal(): void {
  // create an object with the current game state
  // make a copy of each of the necessary datas
  const saveData: Data = {
    geocoinListData: geocoinList, // copy geocoinList to avoid reference issues
    geocachePopupData: Array.from(geocachePopup.entries()), // convert Map to array of entries
    playerLocationData: playerMarker.getLatLng(), // copy LatLng object
    coordinateData: coordinates, // copy coordinates array
  };

  // convert  object to JSON and store it in local storage
  localStorage.setItem("playerData", JSON.stringify(saveData));
}

// define function to load game data from local storage
function loadLocal(): void {
  // Retrieve saved data from local storage
  const loadData = localStorage.getItem("playerData");
  let data: Data;

  if (loadData) {
    // if saved data exists, parse it and update game state
    data = JSON.parse(loadData) as Data;
    // update variables
    geocoinList = data.geocoinListData;
    geocachePopup = new Map(data.geocachePopupData);
    playerMarker.setLatLng(data.playerLocationData);
    coordinates = data.coordinateData;
  } else {
    // if no saved data, initialize with default values
    data = {
      geocoinListData: [],
      geocachePopupData: [],
      playerLocationData: MERRILL_CLASSROOM,
      coordinateData: [],
    };
  }
  statusPanel.innerHTML = `Geocoins: ${geocoinList.length}`;
}

// function to continuously save game data and log a message
function mainLoop(): void {
  saveLocal(); // save game data to local storage
  requestAnimationFrame(mainLoop);
  console.log("saving"); // log a message to the console
}
// start the game loop
mainLoop();
