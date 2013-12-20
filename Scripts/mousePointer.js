/// <reference path="common.js" />

//Variables............................................................................
var canvas,
    readout,
    context,
    image;

function drawCanvasImage(divName, canvasName, imageName) {   
    initializeCanvas(divName, canvasName, imageName);
    drawBackground();

    image.onload = function (e) {
        drawBackground();
    };

    canvas.onmousemove = function (e) {
        var loc = windowToCanvas(canvas, e.clientX, e.clientY);
        updateReadout(loc.x, loc.y);
        drawBackground();
    };
}

function initializeCanvas(divName, canvasName, imageName) {  
    var canvasContext = initCanvas(canvas, canvasName, context);
    canvas = canvasContext.cvsElement;
    context = canvasContext.ctxElement;
    image = new Image();
    image.src = imageName;
    readout = document.getElementById(divName);
}

function eraseCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
    eraseCanvas();
    context.drawImage(image, 0, 0);
}

function windowToCanvas(canvas, x, y) {
    var bbox = canvas.getBoundingClientRect();
    return {
        x: x - bbox.left * (canvas.width / bbox.width),
        y: y - bbox.top * (canvas.height / bbox.height)
    };
}

function updateReadout(x, y) {
    readout.innerText = '(' + x.toFixed(0) + ',' + y.toFixed(0) + ')';
}