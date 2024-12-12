const carCanvas=document.getElementById("carCanvas");
carCanvas.width=window.innerWidth - 330;
const networkCanvas=document.getElementById("networkCanvas");
networkCanvas.width=300;
const miniMapCanvas=document.getElementById("miniMapCanvas");
miniMapCanvas.width=300;
miniMapCanvas.height=300;

carCanvas.height=window.innerHeight;
networkCanvas.height=window.innerHeight-300;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

/*
const worldString = localStorage.getItem("world");
const worldInfo = worldString ? JSON.parse(worldString) : null;
const world = worldInfo
   ? World.load(worldInfo)
   : new World(new Graph());
*/
const viewport = new Viewport(carCanvas, world.zoom, world.offset);
const miniMap = new MiniMap(miniMapCanvas, world.graph, 300);

const N=1 ;
const cars=generateCars(N);

let bestCar = cars[0];
bestCar.brain = brainNetwork;
localStorage.setItem("bestBrain",JSON.stringify(bestCar.brain));

if(localStorage.getItem("bestBrain")){
    for(let i=0;i<cars.length;i++){
        cars[i].brain=JSON.parse(
            localStorage.getItem("bestBrain"));
        if(i!=0){
            NeuralNetwork.mutate(cars[i].brain,0.1);
        }
    }
}

const traffic=[];
const roadBorders = world.roadBorders.map((s) => [s.p1, s.p2]);

animate();

function save(){
    const element = document.createElement("a");
    element.setAttribute(
        "href",
        "data:application/json;charset=utf-8,"+
        encodeURIComponent(JSON.stringify(bestCar.brain))
    );
    const filename = "carBrain.network";
    element.setAttribute("download",filename);

    element.click();

    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
}

function discard(){
    localStorage.removeItem("bestBrain");
}

function load(event){
    const  file = event.target.files[0];
    if(!file){
        alert("No file selected.");
        return;
    }

    const reader = new FileReader();
    reader.readAsText(file);

    reader.onload = (evt) => {
        const fileContent = evt.target.result;
        const jsonData = JSON.parse(fileContent);
        bestCar.brain = NeuralNetwork.load(jsonData);
        localStorage.setItem("bestBrain",JSON.stringify(bestCar.brain));
        location.reload();

    }

}

function generateCars(N){
    const startPoints = world.markings.filter((m) => m instanceof Start);
    const startPoint = startPoints.length > 0
      ? startPoints[0].center
      : new Point(100, 100);
    const dir = startPoints.length > 0
      ? startPoints[0].directionVector
      : new Point(0, -1);
    const startAngle = - angle(dir) + Math.PI / 2;
    
    const cars=[];
    for(let i=1;i<=N;i++){
        cars.push(new Car(startPoint.x, startPoint.y,30,50,"AI",startAngle));
    }
    return cars;
}

function animate(time){
    for(let i=0;i<traffic.length;i++){
        traffic[i].update(roadBorders,[]);
    }
    for(let i=0;i<cars.length;i++){
        cars[i].update(roadBorders,traffic);
    }
    bestCar=cars.find(
        c=>c.fittness==Math.max(
            ...cars.map(c=>c.fittness)
        ));

    world.cars = cars;
    world.bestCar = bestCar;

    viewport.offset.x = -bestCar.x;
    viewport.offset.y = -bestCar.y;

    viewport.reset();
    const viewPoint = scale(viewport.getOffset(), -1);
    world.draw(carCtx, viewPoint, false);
    miniMap.update(viewPoint);

    for(let i=0;i<traffic.length;i++){
        traffic[i].draw(carCtx);
    }

    networkCtx.lineDashOffset=-time/50;
    networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    requestAnimationFrame(animate);
}