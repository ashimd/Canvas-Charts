//#region request_animation_frame_shim
var requestAnimationFrameImplementation = window.requestAnimationFrame;
//        requestAnimationFrame
//            (function () {
//                return (
//                    window.requestAnimationFrame ||
//                    window.webkitRequestAnimationFrame ||
//                    window.mozRequestAnimationFrame ||
//                    window.oRequestAnimationFrame ||
//                    window.msRequestAnimationFrame ||
//                    function (/* function */callback) {
//                        window.setTimeout(callback, 1000 / 60);
//                    }
//                );
//            })();

//(function () {
//    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
//                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
//    window.requestAnimationFrame = requestAnimationFrame;
//})();

// look for vendor prefixed function
if (typeof requestAnimationFrameImplementation === 'undefined') {
    var vendors = ['webkit', 'moz', 'ms', 'o'];
    var i = 0;
    var len = vendors.length;
    while (i < len && typeof requestAnimationFrameImplementation === 'undefined') {
        requestAnimationFrameImplementation = window[vendors[i] + 'RequestAnimationFrame'];
        ++i;
    }
}

// build an implementation based on setTimeout
if (typeof requestAnimationFrameImplementation === 'undefined') {
    var lastFrameTime = 0;
    requestAnimationFrameImplementation = function (callback) {
        var currentTime;
        if (BrowserISIE()) {
            if (GetIEVersion() < 9) {
                Date.now = Date.now || function () { return +new Date; };
                currentTime = Date.now;
            }
            else {
                currentTime = Date.now();
            }
        }
        else {
            currentTime = Date.now();
        }

        // schedule the callback to target 60fps, 16.7ms per frame,
        // accounting for the time taken by the callback
        var delay = Math.max(16 - (currentTime - lastFrameTime), 0);
        lastFrameTime = currentTime + delay;

        return setTimeout(function () {
            callback(lastFrameTime);
        }, delay);
    };
}


var requestAnimationFrame = function (callback) {
    // we need this extra wrapper function because the native requestAnimationFrame
    // functions must be invoked on the global scope (window), which is not the case
    // if invoked as Cesium.requestAnimationFrame(callback)
    requestAnimationFrameImplementation(callback);
};

//#endregion


/**
* Initialize the canvas based on the browser compatibility.
* @param {Canvas} canvasElement
* @param {String} canvasName
* @param {CanvasRenderingContext2D} contextElement
*/
function initCanvas(canvasElement, canvasName, contextElement) {
    if (BrowserISIE()) {
        if (GetIEVersion() <= 9) {
            //canvasU = document.getElementById('canUnitsSoldChart');
            canvasElement = document.getElementById(canvasName);
            if (canvasElement.getContext) {
                // alert(canvasElement.getContext);
                contextElement = canvasElement.getContext('2d');
            }
        }
        else {
            canvasElement = document.getElementById(canvasName);
            contextElement = canvasElement.getContext('2d');
        }
    }
    else {
        canvasElement = document.getElementById(canvasName);
        contextElement = canvasElement.getContext('2d');
    }
    return {
        cvsElement: canvasElement,
        ctxElement: contextElement
    };
}

/**
* Draws a line based on the parameters on the canvas.
* @param {CanvasRenderingContext2D} ctx
* @param {String} strokeStyle
* @param {Number} lineWidth
* @param {Number} xStart
* @param {Number} yStart
* @param {Number} xEnd
* @param {Number} yEnd
*/
function drawLine(ctx, strokeStyle, lineWidth, xStart, yStart, xEnd, yEnd) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(xStart, yStart);
    ctx.lineTo(xEnd, yEnd);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

/**
* Draws a rectangle based on the parameters on the canvas.
* @param {CanvasRenderingContext2D} ctx
* @param {Number} arcPosX
* @param {Number} arcPosY
* @param {Number} arcRad
* @param {Number} arcStrAng
* @param {Number} arcEndAng
* @param {String} drawStyle
* @param {Number} lineWidth
* @param {String} arcColor
* @param {Boolean} counterClockwise
*/
function drawRectangle(ctx, x, y, width, height, drawStyle, rectColor) {
    ctx.save();
    if (drawStyle == 'stroke') {
        ctx.strokeStyle = rectColor;
        ctx.strokeRect(x, y, width, height);
    }
    else {
        ctx.fillStyle = rectColor;
        ctx.fillRect(x, y, width, height);
    }
    ctx.restore();
}

/**
* Draws a rounded rectangle using the current state of the canvas.
* If you omit the last three params, it will draw a rectangle
* outline with a 5 pixel border radius
* @param {CanvasRenderingContext2D} ctx
* @param {Number} x The top left x coordinate
* @param {Number} y The top left y coordinate
* @param {Number} width The width of the rectangle
* @param {Number} height The height of the rectangle
* @param {Number} radius The corner radius. Defaults to 5;
* @param {Boolean} fill Whether to fill the rectangle. Defaults to false.
* @param {Boolean} stroke Whether to stroke the rectangle. Defaults to true.
*/
function roundRect(ctx, x, y, width, height, radius, fill, fillStyle, stroke, strokeStyle) {
    if (typeof stroke == "undefined") {
        stroke = true;
    }
    if (typeof radius === "undefined") {
        radius = 5;
    }
    if (stroke) {
        ctx.strokeStyle = strokeStyle;
    }
    if (fill) {
        ctx.fillStyle = fillStyle;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (stroke) {
        ctx.stroke();
    }
    if (fill) {
        ctx.fill();
    }
}

/**
* Draws text based on the canvas.
* @param {CanvasRenderingContext2D} ctx
* @param {String} fillStyle
* @param {String} fontStyle
* @param {Number} xPos
* @param {Number} yPos
* @param {String} message
* @param {String} txtAlign
*/
function drawText(ctx, strokeStyle, fontStyle, xPos, yPos, message, txtAlign) {
    ctx.save();
    ctx.fillStyle = strokeStyle;
    ctx.font = fontStyle;
    if (txtAlign) {
        ctx.textAlign = txtAlign;
    }
    else {
        ctx.textAlign = "left";
    }
    ctx.fillText(message, xPos, yPos);
    ctx.restore();
}

/**
* Gets the largest number from an array of numbers.
* @param {array} numArray The array of numbers (int or decimal)
*/
function getLargestNumber(numArray) {
    var largestNumber = numArray[0];
    var i;
    for (i = 0; i < numArray.length; i++) {
        if (numArray[i] > largestNumber) {
            largestNumber = numArray[i];
        }
    }
    return largestNumber;
}

/**
* Returns the sum of the numbers in an array
* @param {array} numArray The array of numbers (int or decimal)
*/
function sumOfArray(numArray) {
    var sumNumber = 0;
    for (var i = 0; i < numArray.length; i++) {
        sumNumber += parseInt(numArray[i]);
    }
    return sumNumber;
}

function sumOf2dArray(numArray) {
    var sumArray = new Array(numArray[0].length);
    for (var i = 0; i < numArray[0].length; i++) {
        sumArray[i] = 0;
    }
    for (var i = 0; i < numArray[0].length; i++)
        for (var j = 0; j < numArray.length; j++)
            sumArray[i] += parseInt(numArray[j][i]);
    return sumArray;
}

function setShadow(ctx, shadowColor, offsetX, offsetY, blur, setUnset) {
    if (setUnset) {
        ctx.shadowColor = shadowColor;
        ctx.shadowOffsetX = offsetX;
        ctx.shadowOffsetY = offsetY;
        ctx.shadowBlur = blur;
    }
    else {
        ctx.shadowColor = undefined;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
    }
}

function drawCenteredText(ctx, x, y, w, h, text, valFont, valFillS, stroke) {
    ctx.textBaseline = "middle";
    ctx.font = valFont;
    ctx.fillStyle = valFillS;

    var textX = x + w / 2 - ctx.measureText(text).width / 2;
    var textY = y + h / 2;
    if (stroke)
        ctx.strokeText(text, textX, textY);
    else
        ctx.fillText(text, textX, textY);
}

/**
 * @param ctx2d     : The ctx2d object where to draw . 
 *                     This object is usually obtained by doing: *                 
 * @param x         :  The x position of the rectangle.
 * @param y         :  The y position of the rectangle.
 * @param w         :  The width of the rectangle.
 * @param h         :  The height of the rectangle.
 * @param text      :  The text we are going to centralize.
 * @param fh        :  The font height (in pixels).
 * @param spl       :  Vertical space between lines.
 * @param rectStk   :
 * @param rectLinW  :
 * @param valFont   :
 * @param valFillS  :
 */
paint_centered_wrap = function (ctx2d, x, y, w, h, text, fh, spl, rectStk, rectLinW, valFont, valFillS) {
    // The painting properties 
    // Normally I would write this as an input parameter
    var Paint = { RECTANGLE_STROKE_STYLE: rectStk, RECTANGLE_LINE_WIDTH: rectLinW, VALUE_FONT: valFont, VALUE_FILL_STYLE: valFillS }
    /*
     * @param ctx   : The 2d context 
     * @param mw    : The max width of the text accepted
     * @param font  : The font used to draw the text
     * @param text  : The text to be splitted   into 
     */
    var split_lines = function (ctx, mw, font, text) {
        // We give a little "padding"
        // This should probably be an input param
        // but for the sake of simplicity we will keep it
        // this way
        mw = mw - 10;
        // We setup the text font to the context (if not already)
        ctx2d.font = font;
        // We split the text by words 
        var words = text.split(' ');
        var new_line = words[0];
        var lines = [];
        for (var i = 1; i < words.length; ++i) {
            if (ctx.measureText(new_line + " " + words[i]).width < mw) {
                new_line += " " + words[i];
            } else {
                lines.push(new_line);
                new_line = words[i];
            }
        }
        lines.push(new_line);
        // DEBUG 
        // for(var j = 0; j < lines.length; ++j) {
        //    console.log("line[" + j + "]=" + lines[j]);
        // }
        return lines;
    }

    // It may return null    
    if (ctx2d) {
        // draw rectangular
        ctx2d.strokeStyle = Paint.RECTANGLE_STROKE_STYLE;
        ctx2d.lineWidth = Paint.RECTANGLE_LINE_WIDTH;
        ctx2d.strokeRect(x, y, w, h);
        // Paint text
        var lines = split_lines(ctx2d, w, Paint.VALUE_FONT, text);
        // Block of text height
        var both = lines.length * (fh + spl);
        if (both >= h) {
            // We won't be able to wrap the text inside the area
            // the area is too small. We should inform the user 
            // about this in a meaningful way
        } else {
            // We determine the y of the first line
            var ly = (h - both) / 2 + y + spl * lines.length;
            var lx = 0;
            for (var j = 0, ly; j < lines.length; ++j, ly += fh + spl) {
                // We continue to centralize the lines
                lx = x + w / 2 - ctx2d.measureText(lines[j]).width / 2;
                // DEBUG 
                console.log("ctx2d.fillText('" + lines[j] + "', " + lx + ", " + ly + ")");
                ctx2d.fillText(lines[j], lx, ly);
            }
        }
    } else {
        // Do something meaningful
    }
}

/**
* Gets the mouse points on the canvas.
* @param {Canvas} canvas
* @param {Event} evt
*/
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}