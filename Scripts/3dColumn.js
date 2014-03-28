/// <reference path="common.js" />

//Variables............................................................................
var canvas3d,
    context3d;

//Functions............................................................................

function initialize(canvas3dName) {
    debugger;
    debugger;
    debugger;
    debugger;
    var canvascontext = initCanvas(canvas3d, canvas3dName, context3d);
    canvas3d = canvascontext.cvsElement;
    context3d = canvascontext.ctxElement;
}

function draw3dColumn(canvas3dName, noYears, valYears) {
    initialize(canvas3dName);
    drawBackground();
    drawTopRect();
    drawBottomRect();
    debugger;
    debugger;
    debugger;
    debugger;
    drawChart(noYears, valYears);
}

function drawChart(noYears, valYears) {
    var sumOfProducts = sumOf2dArray(valYears);
    var largestVal = getLargestNumber(sumOfProducts);
    var maxVal = Math.round(largestVal * 1.07);

    var chartRect = {
        x1: (canvas3d.width * 0.4) - (canvas3d.width / 35),
        y1: (0.8 / 35 * canvas3d.width) + (1 / 3 * canvas3d.height),
        x2: (33 * canvas3d.width / 35),
        y2: (canvas3d.height - (canvas3d.width / 35))
    };

    var plotArea = {
        cod1: [(chartRect.x1 * 11 / 10), (chartRect.y1 * 13 / 10)],
        cod2: [(chartRect.x2 * 9 / 10), (chartRect.y1 * 15 / 10)],
        cod3: [(chartRect.x1 * 11.2 / 10), (chartRect.y1 * 22.9 / 10)],
        cod4: [(chartRect.x2 * 8.5 / 10), (chartRect.y1 * 24.9 / 10)]
    };
    drawRectangle(context3d, chartRect.x1, chartRect.y1, (chartRect.x2 - chartRect.x1), (chartRect.y2 - chartRect.y1), 'stroke', 'rgba(212, 212, 212, 1)');
    drawPlotArea(plotArea, 'rgba(212, 212, 212, 1)', 1, noYears, maxVal);
    drawCube(noYears, valYears, plotArea);
}

function drawPlotArea(plotArea, plotColor, plotWidth, noYears, maxVal) {
    drawLine(context3d, plotColor, plotWidth, plotArea.cod1[0], plotArea.cod1[1], plotArea.cod2[0], plotArea.cod2[1]);
    drawLine(context3d, plotColor, plotWidth, plotArea.cod2[0], plotArea.cod2[1], plotArea.cod4[0], plotArea.cod4[1]);
    drawLine(context3d, plotColor, plotWidth, plotArea.cod3[0], plotArea.cod3[1], plotArea.cod4[0], plotArea.cod4[1]);
    drawLine(context3d, plotColor, plotWidth, plotArea.cod1[0], plotArea.cod1[1], plotArea.cod3[0], plotArea.cod3[1]);

    var j = noYears.length;
    for (var i = 0; i <= noYears.length; i++) {
        drawCenteredText(context3d, (plotArea.cod2[0] * 1.02) + (((plotArea.cod4[0] - plotArea.cod2[0]) / (noYears.length)) * j), (plotArea.cod2[1] * 0.98) + (((plotArea.cod4[1] - plotArea.cod2[1]) / (noYears.length)) * j), 10, 10, (i * maxVal / noYears.length), '8px Tahoma', plotColor);
        if (i != 0 && i != (noYears.length))
            drawLine(context3d,
                plotColor,
                plotWidth,
                plotArea.cod1[0] + (((plotArea.cod3[0] - plotArea.cod1[0]) / (noYears.length)) * j),
                plotArea.cod1[1] + (((plotArea.cod3[1] - plotArea.cod1[1]) / (noYears.length)) * j),
                plotArea.cod2[0] + (((plotArea.cod4[0] - plotArea.cod2[0]) / (noYears.length)) * j),
                plotArea.cod2[1] + (((plotArea.cod4[1] - plotArea.cod2[1]) / (noYears.length)) * j)
                );
        j--;
    }
}


function setShadow(shadowColor, setUnset) {
    if (setUnset) {
        context3d.shadowColor = shadowColor;
        context3d.shadowOffsetX = 2;
        context3d.shadowOffsetY = 2;
        context3d.shadowBlur = 4;
    }
    else {
        context3d.shadowColor = undefined;
        context3d.shadowOffsetX = 0;
        context3d.shadowOffsetY = 0;
        context3d.shadowBlur = 0;
    }
}

function drawCube(noYears, valYears, plotArea) {
    //roundRect(context3d,
    //    plotArea.cod1[0],
    //    plotArea.cod1[1],
    //    plotArea.cod2[0] - plotArea.cod1[0],
    //    plotArea.cod2[1] - plotArea.cod1[1],
    //    4,
    //    true,
    //    'red');

    var slope = (plotArea.cod4[1] - plotArea.cod3[1]) / (plotArea.cod4[0] - plotArea.cod3[0]);

    var cubeDim = {
        cod1:[(1.1 * (plotArea.cod3[0] * 0.95)), (0.98 * plotArea.cod3[1] * 1.05)], 
        cod2:[(1.1 * plotArea.cod3[0] * 1.10), (0.98 * (plotArea.cod3[1] + (slope * (plotArea.cod3[0] * 0.75))))],
        cod3:[(plotArea.cod3[0] * 0.95), (plotArea.cod3[1] * 1.05)], 
        cod4:[(plotArea.cod3[0] * 1.10), (plotArea.cod3[1] + (slope * (plotArea.cod3[0] * 0.75)))] 
    }


    context3d.lineWidth = 5;
    context3d.lineJoin = 'round';
    context3d.strokeStyle = 'skyblue';
    context3d.fillStyle = 'skyblue';

    //setShadow('gray', true);

    context3d.beginPath();
    context3d.moveTo(cubeDim.cod3[0], cubeDim.cod3[1]);
    context3d.lineTo(cubeDim.cod4[0], cubeDim.cod4[1]);
    context3d.lineTo(cubeDim.cod2[0], cubeDim.cod2[1]);
    context3d.lineTo(cubeDim.cod1[0], cubeDim.cod1[1]);
    context3d.lineTo(cubeDim.cod3[0], cubeDim.cod3[1]);

    context3d.lineTo(cubeDim.cod3[0], cubeDim.cod3[1] * 0.97);
    context3d.lineTo(cubeDim.cod1[0], cubeDim.cod1[1] * 0.97);
    context3d.lineTo(cubeDim.cod2[0], cubeDim.cod2[1] * 0.97);
    context3d.lineTo(cubeDim.cod2[0], cubeDim.cod2[1]);
    context3d.stroke();
    context3d.fill();
    context3d.closePath();

    //setShadow('', false);

    //context3d.arc(300, 190, 150, 0, Math.PI * 2, false); // Outer: CCW
    //context3d.arc(300, 190, 100, 0, Math.PI * 2, true); // Inner: CW
    //context3d.fill();
    //context3d.shadowColor = undefined;
    //context3d.shadowOffsetX = 0;
    //context3d.shadowOffsetY = 0;
    //context3d.stroke();

}


function drawBackground() {
    context3d.clearRect(0, 0, canvas3d.width, canvas3d.height);

    var grad = context3d.createLinearGradient(0, 0, canvas3d.width, 0);

    grad.addColorStop(0, "rgba(186, 195, 202, 1)");
    grad.addColorStop(1 / 3, "rgba(232, 236, 239, 1)");
    grad.addColorStop(2 / 3, "rgba(232, 236, 239, 1)");
    grad.addColorStop(1, "rgba(186, 195, 202, 1)");

    context3d.fillStyle = grad;
    context3d.fillRect(0, 0, canvas3d.width, canvas3d.height);
}

function drawTopRect() {
    var topRect = { x1: canvas3d.width / 35, y1: canvas3d.width / 35, x2: 34 * canvas3d.width / 35, y2: 1 / 3 * canvas3d.height };
    drawRectWithShadows(topRect.x1, topRect.y1, (topRect.x2 - topRect.x1), (topRect.y2 - topRect.y1), 'rgba(250, 250, 250, 1)', 'rgba(153, 160, 166, 0.6)');

    drawCircWithShadows(topRect.x1 * 3 / 2, topRect.y1 * 3 / 2, 4, 'rgba(250, 250, 250, 1)', 'rgba(229, 229, 227, 1)', 'rgba(153, 160, 166, 1)');
    drawCircWithShadows((topRect.x2 - topRect.x1) + (topRect.x1 * 1 / 2), topRect.y1 * 3 / 2, 4, 'rgba(250, 250, 250, 1)', 'rgba(229, 229, 227, 1)', 'rgba(153, 160, 166, 1)');
    drawCircWithShadows(topRect.x1 * 3 / 2, (topRect.y2 - topRect.y1) + (topRect.y1 * 1 / 2), 4, 'rgba(250, 250, 250, 1)', 'rgba(229, 229, 227, 1)', 'rgba(153, 160, 166, 1)');
    drawCircWithShadows((topRect.x2 - topRect.x1) + (topRect.x1 * 1 / 2), (topRect.y2 - topRect.y1) + (topRect.y1 * 1 / 2), 4, 'rgba(250, 250, 250, 1)', 'rgba(229, 229, 227, 1)', 'rgba(153, 160, 166, 1)');

    drawCenteredText(context3d, topRect.x1, topRect.y1, (topRect.x2 - topRect.x1), (topRect.y2 - topRect.y1), 'NO TOPIC', '32px Impact', 'rgba(100, 100, 100, 1)');
}

function drawBottomRect() {
    var bottomRect = { x1: (canvas3d.width / 35), y1: (0.8 / 35 * canvas3d.width) + (1 / 3 * canvas3d.height), x2: (34 / 35 * canvas3d.width), y2: (canvas3d.height - (canvas3d.width / 35)) };
    drawRectWithShadows(bottomRect.x1, bottomRect.y1, (bottomRect.x2 - bottomRect.x1), (bottomRect.y2 - bottomRect.y1), 'rgba(250, 250, 250, 1)', 'rgba(153, 160, 166, 0.6)');

    drawCircWithShadows(bottomRect.x1 * 3 / 2, (bottomRect.y1 + (canvas3d.width / 70)), 4, 'rgba(250, 250, 250, 1)', 'rgba(229, 229, 227, 1)', 'rgba(153, 160, 166, 1)');
    drawCircWithShadows((bottomRect.x2 - bottomRect.x1) + (bottomRect.x1 * 1 / 2), (bottomRect.y1 + (canvas3d.width / 70)), 4, 'rgba(250, 250, 250, 1)', 'rgba(229, 229, 227, 1)', 'rgba(153, 160, 166, 1)');
    drawCircWithShadows(bottomRect.x1 * 3 / 2, bottomRect.y2 - (canvas3d.width / 70), 4, 'rgba(250, 250, 250, 1)', 'rgba(229, 229, 227, 1)', 'rgba(153, 160, 166, 1)');
    drawCircWithShadows((bottomRect.x2 - bottomRect.x1) + (bottomRect.x1 * 1 / 2), bottomRect.y2 - (canvas3d.width / 70), 4, 'rgba(250, 250, 250, 1)', 'rgba(229, 229, 227, 1)', 'rgba(153, 160, 166, 1)');
}

function drawRectWithShadows(x1, y1, width, height, rectColor, shadowColor) {
    setShadow(context3d, shadowColor, 6, 6, 5, true);
    drawRectangle(context3d, x1, y1, width, height, 'fill', rectColor);
    setShadow(context3d, shadowColor, -1, -1, 5, true);
    drawRectangle(context3d, x1, y1, width, height, 'fill', rectColor);
    setShadow(context3d, '', false);
}

function drawCircWithShadows(x1, y1, radius, gradColor1, gradColor2, shadowColor) {
    context3d.save();
    setShadow(context3d, shadowColor, 1, 1, 1, true);

    var grad = context3d.createLinearGradient(x1, y1, x1, radius * 2);
    grad.addColorStop(0, gradColor1);
    grad.addColorStop(1, gradColor2);
    context3d.fillStyle = grad;
    context3d.beginPath();
    context3d.arc(x1, y1, radius, 0, 2 * Math.PI, false);
    context3d.closePath();
    context3d.fill();
    setShadow(context3d, '', false);
    context3d.restore();
}