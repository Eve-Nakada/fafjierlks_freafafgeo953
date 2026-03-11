let canvas;
let ctx;

let player;

function initGame(){

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  resize();
  window.addEventListener("resize", resize);

  player = createPlayer();

  requestAnimationFrame(loop);
}

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function loop(){

  update();
  draw();

  requestAnimationFrame(loop);
}

function update(){
  player.update();
}

function draw(){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  player.draw(ctx);
}
