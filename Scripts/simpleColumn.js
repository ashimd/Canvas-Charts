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
    vGap = 0,
    hMax = 0;
var offsetT = { x: 0, y: 0 };

//Functions............................................................................

function erase() {
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function initialize(canvasName, xVal, yVal, comment, commentText, commentBackground) {
    var canvasContext = initCanvas(canvas, canvasName, context);
    canvas = canvasContext.cvsElement;
    context = canvasContext.ctxElement;
    context.lineWidth = 0.5;
    chartRect = { x1: (1 / 10 * canvas.width), y1: (9 / 10 * canvas.height), x2: (9 / 10 * canvas.width), y2: (1 / 10 * canvas.height) };

    canvas.addEventListener('mousemove', function (evt) {
        var mousePos = getMousePos(canvas, evt);
        var mouseX = mousePos.x;
        var mouseY = mousePos.y;
        hoverColumn(mouseX, mouseY, xVal, yVal, comment, commentText, commentBackground);
    }, false);
}

function drawColumn(canvasName, grid, shadow, xVal, yVal, columnColor, columnFill, textColor, comment, commentText, commentBackground) {

    initialize(canvasName, xVal, yVal, comment, commentText, commentBackground);
    erase();

    if (grid)
        drawGrid('lightgray', chartRect.x1 / 4, chartRect.y2 / 4);

    drawChart(xVal, yVal, columnColor, columnFill, textColor, shadow);
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

function drawChart(xVal, yVal, columnColor, columnFill, textColor, shadow) {
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
        vGap = Math.round(vMax / 10);
        hMax = xVal.length + 1;

        for (increment == 0; increment <= vGap; increment++) {
            if (increment % 3 == 0) {
                drawText(context, textColor, 'normal Callibri ' + ((canvas.height + canvas.width) / 32) + 'pt', (1.2 * chartRect.x1), (chartRect.y1 - ((chartRect.y1 - chartRect.y2) / 10) * increment), (increment * vGap), 'right');
            }
        }
        debugger;
        increment = 0;

        for (increment == 0; increment < barCount; increment++) {
            if (shadow)
                setShadow('gray', true);
            drawRectangle(context,
                (chartRect.x1 * 0.7) + (chartRect.x2 / hMax * (increment + 1)),
                (chartRect.y1 - ((chartRect.y1 - chartRect.y2) / yMax) * yVal[increment]),
                 (chartRect.x1 * 0.7),
                 chartRect.y1 - (chartRect.y1 - ((chartRect.y1 - chartRect.y2) / yMax) * yVal[increment]),
                 columnFill,
                 columnColor);
            if (shadow)
                setShadow('', false);

            if (increment % 3 == 0) {
                drawText(context, textColor, 'normal Callibri ' + ((canvas.height + canvas.width) / 32) + 'pt', chartRect.x1 + (chartRect.x2 / hMax * (increment + 1)), ((chartRect.y1 * 1.05) + (chartRect.y1 - chartRect.y2) / 30), xVal[increment], 'center');
            }
        }
    }
}

function animateColumns(xVal, yVal, barCount, yMax, vMax, vGap, hMax) {



    requestNextAnimationFrame(animateColumns);
}

function hoverColumn(mouseX, mouseY, xVal, yVal, comment, commentText, commentBackground) {
    debugger;
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
        if (mouseX >= ((chartRect.x1 * 0.7) + (chartRect.x2 / hMax * (increment + 1)) && mouseX <= (chartRect.x2 / hMax * (increment + 1)))) {
            if (mouseY >= ((chartRect.y1 - ((chartRect.y1 - chartRect.y2) / yMax) * yVal[increment])) && mouseY <= (chartRect.y1 - (chartRect.y1 - ((chartRect.y1 - chartRect.y2) / yMax) * yVal[increment]) - (chartRect.y1 - ((chartRect.y1 - chartRect.y2) / yMax) * yVal[increment]))) {
                var message = yVal[increment] + comment + xVal[increment];
                context.strokeStyle = commentText;
                context.fillStyle = commentText;
                $('.tooltip').remove();
                $('body').append('<div class="' + cls + ' tooltip" style="left:' + (offsetT.x + mouseX + 10) + 'px;top:' + (yVal[increment] - 5) + 'px;border-color:' + bordercolor + ';background-color:' + bgcolor + ';color:' + textcolor + ';border-width:' + borderwidth + 'px">' + message + '<canvas id="tip" width="28" height="18" style="bottom:' + tipbot + 'px;"></canvas></div>');
                $(this).mouseleave(function () { $('.tooltip').remove() });
            }
        }
        else
            $(this).mouseleave(function () { $('.tooltip').remove() });
    }

    //for (i = 0; i < xBaseArr.length; i++) {
    //    if (mouseX >= xBaseArr[i] && mouseX <= (xBaseArr[i] + widthArr[i])) {
    //        if (mouseY >= yBaseArr[i] && mouseY <= (yBaseArr[i] + heightArr[i])) {
    //            var message = quarterIdArr[i] + " Sales Value : " + formatCurrency(totalSalesArr[i]);
    //            switch (i) {
    //                case 0:
    //                    ctxT.strokeStyle = "rgba(237, 14, 121, 1)";
    //                    ctxT.fillStyle = "rgba(252, 169, 210, 1)";
    //                    break;
    //                case 1:
    //                    ctxT.strokeStyle = "rgba(181, 212, 46, 1)";
    //                    ctxT.fillStyle = "rgba(211, 231, 135, 1)";
    //                    break;
    //                case 2:
    //                    ctxT.strokeStyle = "rgba(239, 92, 22, 1)";
    //                    ctxT.fillStyle = "rgba(249, 187, 157, 1)";
    //                    break;
    //            }
    //            roundRect(ctx, xBaseArr[i], yBaseArr[i], widthArr[i], heightArr[i], 2, true, true);
    //            $('.tooltip').remove();
    //            $('body').append('<div class="' + cls + ' tooltip" style="left:' + (offsetT.x + mouseX + 10) + 'px;top:' + (yBaseArr[i] - 5) + 'px;border-color:' + bordercolor + ';background-color:' + bgcolor + ';color:' + textcolor + ';border-width:' + borderwidth + 'px">' + message + '<canvas id="tip" width="28" height="18" style="bottom:' + tipbot + 'px;"></canvas></div>');
    //            $(this).mouseleave(function () { $('.tooltip').remove() });
    //        }
    //        else {
    //            switch (i) {
    //                case 0:
    //                    ctxT.strokeStyle = "rgba(237, 14, 121, 1)";
    //                    ctxT.fillStyle = "rgba(237, 14, 121, 1)";
    //                    break;
    //                case 1:
    //                    ctxT.strokeStyle = "rgba(181, 212, 46, 1)";
    //                    ctxT.fillStyle = "rgba(181, 212, 46, 1)";
    //                    break;
    //                case 2:
    //                    ctxT.strokeStyle = "rgba(239, 92, 22, 1)";
    //                    ctxT.fillStyle = "rgba(239, 92, 22, 1)";
    //                    break;
    //            }
    //            roundRect(ctxT, xBaseArr[i], yBaseArr[i], widthArr[i], heightArr[i], 2, true);
    //            $(this).mouseleave(function () { $('.tooltip').remove() });
    //        }
    //    }
    //}
}

