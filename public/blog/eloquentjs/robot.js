//
// Algorithm
//

let active = null;

const places = {
  "Alice's House": { x: 279, y: 100 },
  "Bob's House": { x: 295, y: 203 },
  Cabin: { x: 372, y: 67 },
  "Daria's House": { x: 183, y: 285 },
  "Ernie's House": { x: 50, y: 283 },
  Farm: { x: 36, y: 118 },
  "Grete's House": { x: 35, y: 187 },
  Marketplace: { x: 162, y: 110 },
  "Post Office": { x: 205, y: 57 },
  Shop: { x: 137, y: 212 },
  "Town Hall": { x: 202, y: 213 },
};
const placeKeys = Object.keys(places);
const speed = 2;

const roads = [
  "Alice's House-Bob's House",
  "Alice's House-Cabin",
  "Alice's House-Post Office",
  "Bob's House-Town Hall",
  "Daria's House-Ernie's House",
  "Daria's House-Town Hall",
  "Ernie's House-Grete's House",
  "Grete's House-Farm",
  "Grete's House-Shop",
  "Marketplace-Farm",
  "Marketplace-Post Office",
  "Marketplace-Shop",
  "Marketplace-Town Hall",
  "Shop-Town Hall",
];

function buildGraph(edges) {
  let graph = Object.create(null);
  function addEdge(from, to) {
    if (graph[from] == null) {
      graph[from] = [to];
    } else {
      graph[from].push(to);
    }
  }

  for (let [from, to] of edges.map((r) => r.split("-"))) {
    addEdge(from, to);
    addEdge(to, from);
  }

  return graph;
}

const roadGraph = buildGraph(roads);

function randomPick(array) {
  let choice = Math.floor(Math.random() * array.length);
  return array[choice];
}

function randomRobot(state) {
  return { direction: randomPick(roadGraph[state.place]) };
}

//
// State
//

class VillageState {
  constructor(place, parcels) {
    this.place = place;
    this.parcels = parcels;
  }

  move(destination) {
    if (!roadGraph[this.place].includes(destination)) {
      return this;
    } else {
      let parcels = this.parcels
        .map((p) => {
          if (p.place != this.place) return p;
          return { place: destination, address: p.address };
        })
        .filter((p) => p.place != p.address);
      return new VillageState(destination, parcels);
    }
  }

  static random(parcelCount = 5) {
    let parcels = [];
    for (let i = 0; i < parcelCount; i++) {
      let address = randomPick(Object.keys(roadGraph));
      let place;
      do {
        place = randomPick(Object.keys(roadGraph));
      } while (place == address);
      parcels.push({ place, address });
    }
    return new VillageState("Post Office", parcels);
  }
}

function runRobot(state, robot, memory) {
  for (let turn = 0; ; turn++) {
    if (state.parcels.length == 0) {
      console.log(`Done in ${turn} turns`);
      break;
    }
    let action = robot(state, memory);
    state = state.move(action.direction);
    memory = action.memory;
    console.log(`Moved to ${action.direction}`);
  }
}

//
// View
//

function elt(name, props, ...children) {
  let dom = document.createElement(name);
  if (props) Object.assign(dom, props);
  for (let child of children) {
    if (typeof child != "string") dom.appendChild(child);
    else dom.appendChild(document.createTextNode(child));
  }

  return dom;
}

class RobotAnimation {
  constructor(worldState, robot, robotState) {
    this.worldState = worldState;
    this.robot = robot;
    this.robotState = robotState;
    this.turn = 0;
    this.parcels = [];

    this.village = elt("img", {
      style: "vertical-align: -8px",
      src: "assets/village.png",
    });

    this.robotElt = elt(
      "div",
      {
        style: `width: 40px; position: absolute; transition: left ${
          0.8 / speed
        }s, top ${0.8 / speed}s;
top: 110px; left:162px;`,
      },
      elt("img", {
        style: "width: inherit",
        src: "assets/robot.gif",
      })
    );
    this.robotElt.addEventListener("transitionend", () => this.updateParcels());

    this.text = elt("span");
    this.button = elt(
      "button",
      {
        style: `
color: white;
background: #28b;
border: none;
border-radius: 2px;
padding: 2px 5px;
line-height: 1.1;
font-family: sans-serif;
font-size: 80%`,
      },
      "Stop"
    );
    this.button.addEventListener("click", () => this.clicked());

    this.dom = elt(
      "div",
      { style: "position: relative; line-height: 0.1; margin-left: 10px" },
      this.village,
      this.robotElt,
      this.text,
      this.button
    );

    this.schedule();
    this.updateView();
    this.updateParcels();
  }

  tick() {
    let { direction, memory } = this.robot(this.worldState, this.robotState);
    this.worldState = this.worldState.move(direction);
    this.robotState = memory;
    this.turn++;
    this.updateView();
    if (this.worldState.parcels.length == 0) {
      this.button.remove();
      this.text.textContent = ` Finished after ${this.turn} turns`;
      this.robotElt.firstChild.src = "assets/robot.png";
    } else {
      this.schedule();
    }
  }

  schedule() {
    this.timeout = setTimeout(() => this.tick(), 1000 / speed);
  }

  updateView() {
    let pos = places[this.worldState.place];
    this.robotElt.style.top = pos.y - 38 + "px";
    this.robotElt.style.left = pos.x - 16 + "px";

    this.text.textContent = ` Turn ${this.turn}`;
  }

  updateParcels() {
    // empty parcels
    while (this.parcels.length) this.parcels.pop().remove();

    let heights = {};
    for (let { place, address } of this.worldState.parcels) {
      let height = heights[place] || (heights[place] = 0);
      heights[place] += 14;

      let offset = placeKeys.indexOf(address) * 16;
      let parcel = elt("div", {
        style: `
position: absolute;
height: 16px;
width: 16px;
background-image: url(assets/parcel.png);
background-position: 0 -${offset}px`,
      });

      if (place == this.worldState.place) {
        parcel.style.top = 20 + height + "px";
        parcel.style.left = "25px";
        this.robotElt.appendChild(parcel);
      } else {
        let pos = places[place];
        parcel.style.top = pos.y - 10 - height + "px";
        parcel.style.left = pos.x - 5 + "px";
        this.dom.appendChild(parcel);
      }
      this.parcels.push(parcel);
    }
  }

  clicked() {
    if (this.timeout == null) {
      this.schedule();
      this.button.textContent = "Stop";
      this.robotElt.firstChild.src = "assets/robot.gif";
    } else {
      clearTimeout(this.timeout);
      this.timeout = null;
      this.button.textContent = "Start";
      this.robotElt.firstChild.src = "assets/robot.png";
    }
  }
}

function runRobotAnimation(state, robot, memory) {
  if (active && active.timeout != null) clearTimeout(active.timeout);
  active = new RobotAnimation(state, robot, memory);
}

//
// Application
//

let robotAnimation = new RobotAnimation(VillageState.random(), randomRobot, []);
document.getElementById("root").appendChild(robotAnimation.dom);
