function elt(name, props, ...children) {
  let dom = document.createElement(name);
  if (props) Object.assign(dom, props);
  for (let child of children) {
    if (typeof child != "string") dom.appendChild(child);
    else dom.appendChild(document.createTextNode(child));
  }

  return dom;
}

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

class RobotAnimation {
  constructor(worldState, robot, robotState) {
    this.worldState = worldState;
    this.robot = robot;
    this.robotState = robotState;
    this.turn = 0;

    this.village = elt(
      "div",
      { style: "width: 400px" },
      elt("img", {
        style: "width: inherit",
        src: "../eloquentjs/assets/village.png",
      })
    );

    this.robot = elt(
      "div",
      {
        style: `width: 40px; position: absolute; transition: left ${
          0.8 / speed
        }s, top ${0.8 / speed}s;
top: 110px; left:162px;`,
      },
      elt("img", {
        style: "width: inherit",
        src: "../eloquentjs/assets/robot.gif",
      })
    );

    this.dom = elt(
      "div",
      { style: "position: relative; line-height: 0.1; margin-left: 10px" },
      this.village,
      this.robot
    );
  }
}

let robotAnimation = new RobotAnimation();
document.getElementById("pathfinding").appendChild(robotAnimation.dom);

// This is tricky, come back to this

let sections = document.getElementsByTagName("section");
alert(sections.length);
sections.map((s) => s.addEventListener("onclick", console.log("clicked!", s)));
