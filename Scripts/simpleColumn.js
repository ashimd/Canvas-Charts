/// <reference path="common.js" />
/// <reference path="next-animation-frame.js" />

//Variables............................................................................
var canvas,
    context,
    chartRect,
    columns,
    textAngle = 0,
    textRadius = 0,
    increment = 0,
    barCount = 0,
    yMax = 0,
    vMax = 0,
    vGap = 0,
    hMax = 0,
    drawHeight = 0;
    maxHeight = 0,
    canvasOffset = { x: 0, y: 0 };

//Functions............................................................................

function erase() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function initialize(canvasName, xVal, yVal, comment, commentText, commentBackground) {
    var canvasContext = initCanvas(canvas, canvasName, context);
    canvas = canvasContext.cvsElement;
    context = canvasContext.ctxElement;

    initChart(xVal, yVal);

    canvas.addEventListener('mousemove', function (evt) {
        var mousePos = getMousePos(canvas, evt);
        var mouseX = mousePos.x;
        var mouseY = mousePos.y;
        hoverColumn(mouseX, mouseY, xVal, yVal, comment, commentText, commentBackground);
    }, false);
}

function drawColumn(canvasName, grid, shadow, xVal, yVal, columnColor, columnFill, textColor, comment, commentText, commentBackground) {
    initialize(canvasName, xVal, yVal, comment, commentText, commentBackground);
    erase(0, 0, canvas.width, canvas.height);

    if (grid)
        drawGrid('lightgray', chartRect.x1 / 4, chartRect.y2 / 4);

    drawChart(grid, xVal, yVal, columnColor, columnFill, textColor, shadow);
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

function setShadow(shadowColor, setUnset) {
    if (setUnset) {
        context.shadowColor = shadowColor;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        context.shadowBlur = 4;
    }
    else {
        context.shadowColor = undefined;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        context.shadowBlur = 0;
    }
}

function initChart(xVal, yVal) {
    context.lineWidth = 0.5;
    chartRect = {
        x1: (1 / 10 * canvas.width),
        y1: (9 / 10 * canvas.height),
        x2: (9 / 10 * canvas.width),
        y2: (1 / 10 * canvas.height)
    };

    if (xVal.length != yVal.length) {
        context.save();
        context.beginPath();
        drawText(context, 'bold Callibri ' + +((canvas.height + canvas.width) / 4) + 'pt', 'red', canvas.width / 2, canvas.height / 2, 'X Axis does not match Y Axis values.', 'center');
        context.closePath();
        context.restore();
    }
    else {
        columns = {
            x: new Array(xVal.length),
            y: new Array(xVal.length),
            width: new Array(xVal.length),
            height: new Array(xVal.length)
        }

        barCount = xVal.length;
        yMax = getLargestNumber(yVal);
        vMax = Math.round(yMax + (sumOfArray(yVal) / yMax));
        vGap = Math.round(vMax / 10);
        hMax = xVal.length + 1;

        increment = 0;

        for (increment == 0; increment < barCount; increment++) {

            columns.x[increment] = (chartRect.x1 * 0.7) + (chartRect.x2 / hMax * (increment + 1));
            columns.y[increment] = (chartRect.y1 - ((chartRect.y1 - chartRect.y2) / yMax) * yVal[increment]);
            columns.width[increment] = (chartRect.x1 * 0.7);
            columns.height[increment] = chartRect.y1 - (chartRect.y1 - ((chartRect.y1 - chartRect.y2) / yMax) * yVal[increment]);
        }
        maxHeight = getLargestNumber(columns.height);
    }
}

function drawChart(grid, xVal, yVal, columnColor, columnFill, textColor, shadow) {
    animateColumns(grid, xVal, yVal, columnColor, columnFill, textColor, shadow, drawHeight);
}

function animateColumns(grid, xVal, yVal, columnColor, columnFill, textColor, shadow, drawHeight) {
    erase();
    if (grid)
        drawGrid('lightgray', chartRect.x1 / 4, chartRect.y2 / 4);

    increment = 0;

    for (increment == 0; increment <= vGap; increment++) {
        if (increment % 3 == 0) {
            drawText(context, textColor, 'normal Callibri ' + ((canvas.height + canvas.width) / 32) + 'pt', (1.2 * chartRect.x1), (chartRect.y1 - ((chartRect.y1 - chartRect.y2) / 10) * increment), (increment * vGap), 'right');
        }
    }

    increment = 0;

    for (increment == 0; increment < barCount; increment++) {
        if (shadow)
            setShadow('gray', true);
        if (columns.height[increment] >= drawHeight) {
            drawRectangle(context,
                columns.x[increment],
                columns.y[increment] + columns.height[increment] - drawHeight,
                 columns.width[increment],
                 drawHeight,
                 columnFill,
                 columnColor);
        }
        else {
            drawRectangle(context,
                columns.x[increment],
                columns.y[increment],
                 columns.width[increment],
                 columns.height[increment],
                 columnFill,
                 columnColor);
        }
        if (shadow)
            setShadow('', false);

        if (increment % 3 == 0) {
            drawText(context, textColor, 'normal Callibri ' + ((canvas.height + canvas.width) / 32) + 'pt', chartRect.x1 + (chartRect.x2 / hMax * (increment + 1)), ((chartRect.y1 * 1.05) + (chartRect.y1 - chartRect.y2) / 30), xVal[increment], 'center');
        }
    }
    drawHeight += 1;
    if (drawHeight <= maxHeight) {
        requestAnimationFrame(function () {
            animateColumns(grid, xVal, yVal, columnColor, columnFill, textColor, shadow, drawHeight)
        });
    }

}

function hoverColumn(mouseX, mouseY, xVal, yVal, comment, commentText, commentBackground) {
    /*customizable options*/
    bordercolor = '#666666';
    textcolor = commentText;
    bgcolor = commentBackground;
    borderwidth = '1';
    cls = $(this).attr('class');
    pos = canvas.position;
    tipbot = -18 + (borderwidth / 4);

    var i;
    barCount = xVal.length;
    yMax = getLargestNumber(yVal);
    vMax = Math.round(yMax + (sumOfArray(yVal) / yMax));
    vGap = Math.round(vMax / 10);
    hMax = xVal.length + 1;

    increment = 0;

    for (increment == 0; increment < barCount; increment++) {
        if (mouseX >= columns.x[increment] && mouseX <= (columns.x[increment] + columns.width[increment])) {
            if (mouseY >= columns.y[increment] && mouseY <= columns.y[increment] + columns.height[increment]) {
                var message = yVal[increment] + comment + xVal[increment];
                context.strokeStyle = commentText;
                context.fillStyle = commentText;
                $('.tooltip').remove();
                $('body').append('<div class="' + cls + ' tooltip" style="left:' + (canvasOffset.x + mouseX - ((maxHeight / barCount) + 4* hMax)) + 'px;top:' + (columns.y[increment] - ((maxHeight / barCount) + hMax)) + 'px;border-color:' + bordercolor + ';background-color:' + bgcolor + ';color:' + textcolor + ';border-width:' + borderwidth + 'px">' + message + '<canvas id="tip" width="15" height="18" style="bottom:' + tipbot + 'px;"></canvas></div>');
                $(this).mouseleave(function () { $('.tooltip').remove() });
            }
        }
        else
            $(this).mouseleave(function () { $('.tooltip').remove() });
    }    
}

