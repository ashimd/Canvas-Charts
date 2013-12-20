/// <reference path="common.js" />

//Variables............................................................................
var canvas,
    context,
    chartRect,
    textAngle = 0,
    textRadius = 0,
    increment = 0,
    barCount = 0,
    yMax = 0,
    vMax = 0,
    hMax = 0;


//Functions............................................................................

function erase() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function initialize(canvasName) {
    var canvasContext = initCanvas(canvas, canvasName, context);
    canvas = canvasContext.cvsElement;
    context = canvasContext.ctxElement;
    context.lineWidth = 0.5;
    chartRect = { x: (1 / 10 * canvas.width), y: (9 / 10 * canvas.height), width: (9 / 10 * canvas.width), height: (1 / 10 * canvas.height) };
}

function drawBar(canvasName, chartHeader, title, lineColor, grid, gridColor, xVal, yVal, barStroke, barFill) {

    initialize(canvasName);
    erase();
    drawAxis(lineColor);
    if (grid)
        drawGrid(gridColor, chartRect.x / 4, chartRect.height / 4);
    drawHeader(chartHeader, title);
    drawChart(xVal, yVal, barStroke, barFill);
}

function drawAxis(lineColor) {
    //horizontal axis
    drawLine(context, lineColor, 1, chartRect.x, chartRect.y, chartRect.width, chartRect.y);

    //verticle line
    drawLine(context, lineColor, 1, chartRect.x, chartRect.y, chartRect.x, chartRect.height);


}

function drawGrid(color, stepx, stepy) {
    context.strokeStyle = color;
    context.lineWidth = 0.5;
    for (var i = stepx + 0.5; i < context.canvas.width; i += stepx) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, context.canvas.height);
        context.stroke();
    }
    for (var i = stepy + 0.5; i < context.canvas.height; i += stepy) {
        context.beginPath();
        context.moveTo(0, i);
        context.lineTo(context.canvas.width, i);
        context.stroke();
    }
}

function drawHeader(header, title) {

    context.save();
    context.beginPath();
    drawText(context, header.color, header.style + ' ' + ((canvas.height + canvas.width) / 8) + 'pt', (canvas.width / 2), (chartRect.height / 2), header.text, 'center');
    context.closePath();
    context.restore();

    context.save();
    context.fillStyle = title.ycolor;
    context.fontStyle = title.ystyle + ' ' + ((canvas.height + canvas.width) / 32) + 'pt'
    context.save();
    context.beginPath();
    context.translate((chartRect.x / 4) + Math.cos(textAngle) * textRadius, (canvas.height / 2) - Math.sin(textAngle) * textRadius);
    context.rotate(Math.PI / 2 - textAngle);
    context.fillText(title.yText, 0, 0);
    context.closePath();
    context.restore();

    context.save();
    context.beginPath();
    drawText(context, title.xColor, title.xStyle + ' ' + ((canvas.height + canvas.width) / 32) + 'pt', (canvas.width / 2), (chartRect.y + (3 / 4 * chartRect.height)), title.xText, 'center');
    context.closePath();
    context.restore();
}

function drawChart(xVal, yVal, barStroke, barFill) {
    if (xVal.length != yVal.length) {
        context.save();
        context.beginPath();
        drawText(context, 'bold Callibri ' + +((canvas.height + canvas.width) / 4) + 'pt', 'red', canvas.width / 2, canvas.height / 2, 'X Axis does not match Y Axis values.', 'center');
        context.closePath();
        context.restore();
    }
    else {
        barCount = xVal.length;
        yMax = getLargestNumber(yVal);
        vMax = Math.round(yMax + (sumOfArray(yVal) / yMax));
        hMax = xVal.length + 1;

        for (increment == 0; increment <= 10; increment++) {
            //if (increment > 0)
                //drawLine(context, 'black', 0.5, (4.5 / 5 * chartRect.x), (chartRect.y - ((chartRect.y - chartRect.height) / 10) * increment), (5.5 / 5 * chartRect.x), (chartRect.y - ((chartRect.y - chartRect.height) / 10) * increment));
            drawText(context, 'bold Callibri ' + ((canvas.height + canvas.width) / 32) + 'pt', 'black', (4 / 5 * chartRect.x), (chartRect.y - ((chartRect.y - chartRect.height) / 10) * increment), Math.round(vMax / 10 * increment), 'right');
        }
        debugger;
        increment = 0;

        for (increment == 0; increment < barCount; increment++) {
            context.save();
            drawText(context, 'bold Callibri ' + ((canvas.height + canvas.width) / 32) + 'pt', 'black', chartRect.x + (chartRect.width / hMax * (increment + 1)), (chartRect.y + (chartRect.y - chartRect.height) / 30), xVal[increment], 'center');
            roundRect(context, (chartRect.x * 0.9) + (chartRect.width / hMax * (increment + 1)), (chartRect.y - ((chartRect.y - chartRect.height) / yMax) * yVal[increment]), (chartRect.x * 0.2), chartRect.y - (chartRect.y - ((chartRect.y - chartRect.height) / yMax) * yVal[increment]), 5, true,barFill[increment], true, barStroke[increment]);
            context.restore();
        }
    }

}

