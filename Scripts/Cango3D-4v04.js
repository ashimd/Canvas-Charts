/*=================================================================
  Filename: Cango3D-4v04.js
  By: A.R.Collins

  A basic 3D graphics interface for the canvas
  element using Right Handed coordinate system.

  Kindly give credit to Dr A R Collins <http://www.arc.id.au/>
  Report bugs to tony at arc.id.au

  Date   |Description                                          |By
  -----------------------------------------------------------------
  05May13 First beta after major re-write: soft transforms
          now applied by Group3D method not by render3D.
          Transforms now use grpTfm, ofsTfm, netTfm             ARC
  06May13 bugfix: order of transform multiply reversed
          Make matrixMultiply and transform point globals
          Use RequestAnimationFrame                             ARC
  07May13 Give Group3Ds and Obj3Ds a render method
          Use rAF to limit code in event handlers
          bugfix: group nettFm mat multiply in wrong order
          Only propagate transform updates when rendering       ARC
  08May13 Changed labelShape3D to labelShape                    ARC
  09May13 Don't allow clone to clone cgo property
          Allow only Group3Ds or Obj3Ds to join a Group3D.
          Removed clearCanvas color setting ability (not
          compatable with the new render method). Set
          canvas backgroundColor with setPropertyDefault.
          Added noclear parameter to render3D
          Added noclear, noRaf options to obj and grp render    ARC
  10May13 bugfix: non existant cgo used in compileText3D
          bugfix: bad vectors for calcNormal if cmd = 'Q'       ARC
  11May13 Removed unsed dupCtx
          renamed jsonToDrawCnds3D to _cgo3DtoDrawCmd3D
          Gave objectOfRevolution a 'straight' side option      ARC
  12May13 Replace objOfRev 'radius' with 'xOfs' (opp sign)      ARC
  13May13 Change the depth sort algorithm, sort Group3Ds
          by group centroid.tz, then sort Obj3Ds children.
          If objectOfRevolution has flat top or bottom
          replace multi-segments with single disc
          Patched JSONtoObj3D Group3D decode to be robust
          bugfix: dwgOrg not getting transformed - re-write
          dump Obj3D.dwgOrg and dwgOrgPx, leave in dragNdrop
          bugfix: calcNormal and calcIncAngle could /zero       ARC
  16May13 renamed undocumented methods calcShapeShade,
          getCursorPos and render3D to _calcShapeShade,
          _getCursorPos and _render3D                           ARC
  17May13 Release 3v19                                          ARC
  21May13 Add grpDwgOrg to dragNdrop tracking rootGrp dwgOrg
          and include Z dimension in all drag offsets
          bugfix: bad loop end test (typo in 3v20)
          Added z:0 to cursor positon passed to dragNdrop
          handlers                                              ARC
  22May13 Pass cursor position in world coords                  ARC
  01Jun13 bugfix: _resized etc should be Objects not Arrays     ARC
  02Jun13 Many style changes to make JSLint happy               ARC
  03Jun13 Make clone a private function of objectOfRotation     ARC
  08Jun13 Make PaintersSort a private function                  ARC
  12Jun13 Refactor for performance
          Mod Obj3DtoJSON, JSONtoObj3D to new DrawCmd3Ds
          bugfix: Obj3DtoJSON miss-handled TEXT path
          Add Transform3D.reset to avoid new object creation    ARC
  13Jun13 Re-write matrix ops to assist code optimizers
          Add dwgOrg to Group3Ds and Obj3Ds                     ARC
  14Jun13 Filter rAF calls with rAFactive flag
          Have default rAF loop state running not stopped
          bugfix: textBoxCmds not transformed
          bugfix: no check if draggable already in draggables   ARC
  15Jun13 Use strict mode                                       ARC
  20Jun13 Fix bugs in dragNdrop parent being over-written etc   ARC
  12Aug13 Renamed shapeDefs to shapes3D (avoid 2D shapeDefs)    ARC
  04Sep13 Replace setViewpointDistance with set FOV
          Don't expose Transform3D to user, use StaticTfm       ARC
  06Sep13 Code tidied for JSLint
          Remove drag as a parameter from compile methods
          grpDwgOrg now refers to parent Group3D not root       ARC
  07Sep13 Add parent property to Obj3D and Group3D
          Renamed Drag3D.parent to target for clarity           ARC
  09Sep13 Remove Obj3D.render and Group3D.render, use only
          use Cango3D.render or Cango3D.renderFrame             ARC
  11Sep13 bugfix: memory leak, ofsTfmAry not reset every frame  ARC
  14Sep13 Use better algorithm for viewpointDistance calc       ARC
  =================================================================*/

  // exposed globals
  var Cango3D, shapes3D, Drag3D,
      _resized,
      _draggable; // array of Obj2Ds that are draggable for each canvas

(function()
{
  "use strict";

  if (!Date.now)
  {
    Date.now = function now()
    {
      return new Date().getTime();
    };
  }

  var isArray = function(obj)
  {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  var isNumber = function(o)
  {
    return !isNaN(o) && o !== null && o !== "" && o !== false;
  };

  // simple add event handler that has the handlers called in the sequence that they were set
  var addLoadEvent = function(obj, func)
  {
  	var oldonload = obj.onload;

  	if (typeof(obj.onload) != "function")
    {
      obj.onload = func;
    }
  	else
    {
    	obj.onload = function(){ oldonload(); func(); };
    }
  };

  var addEvent = function(element, eventType, handler)
  {
    if (element.attachEvent)
    {
     return element.attachEvent('on'+eventType, handler);
    }
    return element.addEventListener(eventType, handler, false);
  };

  var removeEvent = function(element, eventType, handler)
  {
   if (element.removeEventListener)
   {
      element.removeEventListener (eventType, handler, false);
   }
   if (element.detachEvent)
   {
      element.detachEvent ('on'+eventType, handler);
   }
  };

  if (!Array.prototype.contains)
  {
    Array.prototype.contains = function(obj)
    {
      var i = this.length;
      while (i--)
      {
        if (this[i] === obj)
        {
          return true;
        }
      }
      return false;
    };
  }

  if (!Array.prototype.map)
  {
    Array.prototype.map = function(fun, thisArg)
    {
      var i,
          len = this.length,
          thisp = thisArg,
          res = [];

      if (typeof fun != "function")
      {
        throw new TypeError();
      }
      for (i = 0; i < len; i++)
      {
        if (this.hasOwnProperty(i))
        {
          res[i] = fun.call(thisp, this[i], i, this);
        }
      }
      return res;
    };
  }

  if (typeof _resized != "object")
  {
     _resized = {};   // keep track of which canvases are initialised
  }

  if (typeof _draggable != "object")
  {
     _draggable = {};   // keep track of draggable objects on each canvas
  }

  if (typeof shapes3D != "object")
  {
    shapes3D = {'circle': ["M", -0.5, 0, 0,
                             "C", -0.5, -0.27614, 0, -0.27614, -0.5, 0, 0, -0.5, 0,
                             "C", 0.27614, -0.5, 0, 0.5, -0.27614, 0, 0.5, 0, 0,
                             "C", 0.5, 0.27614, 0, 0.27614, 0.5, 0, 0, 0.5, 0,
                             "C", -0.27614, 0.5, 0, -0.5, 0.27614, 0, -0.5, 0, 0],
                 'square':  ['M', 0.5, -0.5, 0, 'l', 0, 1, 0, -1, 0, 0, 0, -1, 0, 'z'],
                 'triangle':['M', 0.5, -0.289, 0, 'l', -0.5, 0.866, 0, -0.5, -0.866, 0, 'z'],
                 'cross':   ['M', -0.5, 0, 0, 'l', 1, 0, 0, 'M', 0, -0.5, 0, 'l', 0, 1, 0],
                 'ex':      ['M', -0.3535,-0.3535, 0, 'L',0.3535,0.3535, 0,
                             'M',-0.3535,0.3535, 0, 'L',0.3535,-0.3535, 0]
                };
  }

  /**
   * A class to parse color values
   * @author Stoyan Stefanov <sstoo@gmail.com>
   * @link   http://www.phpied.com/rgb-color-parser-in-javascript/
   * @license Use it if you like it
   *
   * supplemented to handle rgba format (alpha 0 .. 1.0)  by arc 04SEP09
   */
  function RGBAColor(color_string)
  {
    var simple_colors = {
        aliceblue: 'f0f8ff',
        antiquewhite: 'faebd7',
        aqua: '00ffff',
        aquamarine: '7fffd4',
        azure: 'f0ffff',
        beige: 'f5f5dc',
        bisque: 'ffe4c4',
        black: '000000',
        blanchedalmond: 'ffebcd',
        blue: '0000ff',
        blueviolet: '8a2be2',
        brown: 'a52a2a',
        burlywood: 'deb887',
        cadetblue: '5f9ea0',
        chartreuse: '7fff00',
        chocolate: 'd2691e',
        coral: 'ff7f50',
        cornflowerblue: '6495ed',
        cornsilk: 'fff8dc',
        crimson: 'dc143c',
        cyan: '00ffff',
        darkblue: '00008b',
        darkcyan: '008b8b',
        darkgoldenrod: 'b8860b',
        darkgray: 'a9a9a9',
        darkgreen: '006400',
        darkkhaki: 'bdb76b',
        darkmagenta: '8b008b',
        darkolivegreen: '556b2f',
        darkorange: 'ff8c00',
        darkorchid: '9932cc',
        darkred: '8b0000',
        darksalmon: 'e9967a',
        darkseagreen: '8fbc8f',
        darkslateblue: '483d8b',
        darkslategray: '2f4f4f',
        darkturquoise: '00ced1',
        darkviolet: '9400d3',
        deeppink: 'ff1493',
        deepskyblue: '00bfff',
        dimgray: '696969',
        dodgerblue: '1e90ff',
        feldspar: 'd19275',
        firebrick: 'b22222',
        floralwhite: 'fffaf0',
        forestgreen: '228b22',
        fuchsia: 'ff00ff',
        gainsboro: 'dcdcdc',
        ghostwhite: 'f8f8ff',
        gold: 'ffd700',
        goldenrod: 'daa520',
        gray: '808080',
        green: '008000',
        greenyellow: 'adff2f',
        honeydew: 'f0fff0',
        hotpink: 'ff69b4',
        indianred : 'cd5c5c',
        indigo : '4b0082',
        ivory: 'fffff0',
        khaki: 'f0e68c',
        lavender: 'e6e6fa',
        lavenderblush: 'fff0f5',
        lawngreen: '7cfc00',
        lemonchiffon: 'fffacd',
        lightblue: 'add8e6',
        lightcoral: 'f08080',
        lightcyan: 'e0ffff',
        lightgoldenrodyellow: 'fafad2',
        lightgrey: 'd3d3d3',
        lightgreen: '90ee90',
        lightpink: 'ffb6c1',
        lightsalmon: 'ffa07a',
        lightseagreen: '20b2aa',
        lightskyblue: '87cefa',
        lightslateblue: '8470ff',
        lightslategray: '778899',
        lightsteelblue: 'b0c4de',
        lightyellow: 'ffffe0',
        lime: '00ff00',
        limegreen: '32cd32',
        linen: 'faf0e6',
        magenta: 'ff00ff',
        maroon: '800000',
        mediumaquamarine: '66cdaa',
        mediumblue: '0000cd',
        mediumorchid: 'ba55d3',
        mediumpurple: '9370d8',
        mediumseagreen: '3cb371',
        mediumslateblue: '7b68ee',
        mediumspringgreen: '00fa9a',
        mediumturquoise: '48d1cc',
        mediumvioletred: 'c71585',
        midnightblue: '191970',
        mintcream: 'f5fffa',
        mistyrose: 'ffe4e1',
        moccasin: 'ffe4b5',
        navajowhite: 'ffdead',
        navy: '000080',
        oldlace: 'fdf5e6',
        olive: '808000',
        olivedrab: '6b8e23',
        orange: 'ffa500',
        orangered: 'ff4500',
        orchid: 'da70d6',
        palegoldenrod: 'eee8aa',
        palegreen: '98fb98',
        paleturquoise: 'afeeee',
        palevioletred: 'd87093',
        papayawhip: 'ffefd5',
        peachpuff: 'ffdab9',
        peru: 'cd853f',
        pink: 'ffc0cb',
        plum: 'dda0dd',
        powderblue: 'b0e0e6',
        purple: '800080',
        red: 'ff0000',
        rosybrown: 'bc8f8f',
        royalblue: '4169e1',
        saddlebrown: '8b4513',
        salmon: 'fa8072',
        sandybrown: 'f4a460',
        seagreen: '2e8b57',
        seashell: 'fff5ee',
        sienna: 'a0522d',
        silver: 'c0c0c0',
        skyblue: '87ceeb',
        slateblue: '6a5acd',
        slategray: '708090',
        snow: 'fffafa',
        springgreen: '00ff7f',
        steelblue: '4682b4',
        tan: 'd2b48c',
        teal: '008080',
        thistle: 'd8bfd8',
        tomato: 'ff6347',
        transparent: 'rgba(0,0,0,0)',
        turquoise: '40e0d0',
        violet: 'ee82ee',
        violetred: 'd02090',
        wheat: 'f5deb3',
        white: 'ffffff',
        whitesmoke: 'f5f5f5',
        yellow: 'ffff00',
        yellowgreen: '9acd32'
    };
    // array of color definition objects
    var color_defs = [
      {
        re: /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*((1(\.0)?)|0?(\.\d*)?)\)$/,
        example: ['rgba(123, 234, 45, 0.5)', 'rgba(255,234,245,1)'],
        process: function (bits){
            return [
                parseInt(bits[1], 10),
                parseInt(bits[2], 10),
                parseInt(bits[3], 10),
                parseFloat(bits[4], 10)
            ];
        }
      },
      {
        re: /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,
        example: ['rgb(123, 234, 45)', 'rgb(255,234,245)'],
        process: function (bits){
            return [
                parseInt(bits[1], 10),
                parseInt(bits[2], 10),
                parseInt(bits[3], 10)
            ];
        }
      },
      {
        re: /^(\w{2})(\w{2})(\w{2})$/,
        example: ['#00ff00', '336699'],
        process: function (bits){
            return [
                parseInt(bits[1], 16),
                parseInt(bits[2], 16),
                parseInt(bits[3], 16)
            ];
        }
      },
      {
        re: /^(\w{1})(\w{1})(\w{1})$/,
        example: ['#fb0', 'f0f'],
        process: function (bits){
            return [
                parseInt(bits[1] + bits[1], 16),
                parseInt(bits[2] + bits[2], 16),
                parseInt(bits[3] + bits[3], 16)
            ];
        }
      }
    ];

    var i,
        re,
        processor,
        bits,
        channels,
        key;

    this.ok = false;
    if (typeof color_string != "string")       // bugfix: crashed if passed a number
    {
      return;
    }
    // strip any leading #
    if (color_string.charAt(0) == '#')
    { // remove # if any
      color_string = color_string.substr(1,6);
    }

    color_string = color_string.replace(/ /g,'');
    color_string = color_string.toLowerCase();

    // before getting into regexps, try simple matches
    // and overwrite the input
    for (key in simple_colors)
    {
      if (color_string == key)
      {
        color_string = simple_colors[key];
      }
    }

    // search through the definitions to find a match
    for (i=0; i<color_defs.length; i++)
    {
      re = color_defs[i].re;
      processor = color_defs[i].process;
      bits = re.exec(color_string);
      if (bits)
      {
        channels = processor(bits);    // bugfix: was global. [ARC 17Jul12]
        this.r = channels[0];
        this.g = channels[1];
        this.b = channels[2];
        if (bits.length>3)
        {
          this.a = channels[3];
        }
        else
        {
          this.a = 1.0;
        }
        this.ok = true;
      }
    }

    // validate/cleanup values
    this.r = (this.r < 0 || isNaN(this.r)) ? 0 : ((this.r > 255) ? 255 : this.r);
    this.g = (this.g < 0 || isNaN(this.g)) ? 0 : ((this.g > 255) ? 255 : this.g);
    this.b = (this.b < 0 || isNaN(this.b)) ? 0 : ((this.b > 255) ? 255 : this.b);
    this.a = (this.a < 0 || isNaN(this.a)) ? 1.0 : ((this.a > 1) ? 1.0 : this.a);

    // some getters
    this.toRGBA = function()
    {
      return 'rgba(' + this.r + ', ' + this.g + ', '  + this.b + ', ' + this.a + ')';
    };
    this.toRGB = function()
    {
      return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')';
    };
    this.toHex = function()
    {
      var r = this.r.toString(16),
          g = this.g.toString(16),
          b = this.b.toString(16);
      if (r.length == 1)
      {
        r = '0' + r;
      }
      if (g.length == 1)
      {
        g = '0' + g;
      }
      if (b.length == 1)
      {
        b = '0' + b;
      }
      return '#' + r + g + b;
    };
  }

  /* ===============================================
   * Object holding an array of 4 1x4 arrays,
   * representing a 4x4 matrix
   * -----------------------------------------------
   */
  function Transform3D(matrixAry)
  {
    if (matrixAry !== undefined)
    {
      this.matrix = matrixAry;
    }
    else
    {
      this.matrix = [ [1, 0, 0, 0],
                      [0, 1, 0, 0],
                      [0, 0, 1, 0],
                      [0, 0, 0, 1] ];
    }
  }

  // Rotate matrix, pass unit vector along rotation axis, angle in degrees
  Transform3D.prototype.rotate = function(vx, vy, vz, angle)
  {
    var t = Math.PI/180.0,
        mag = Math.sqrt(vx*vx + vy*vy + vz*vz),   // calc vector length
        x	= vx/mag,
        y	= vy/mag,
        z	= vz/mag,
        s	= Math.sin(-angle*t),
        c	= Math.cos(-angle*t),
        C	= 1-c,
        // ref: http://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
        rot = [ [  (x*x*C+c), (y*x*C-z*s), (z*x*C+y*s), 0],
                [(x*y*C+z*s),   (y*y*C+c), (z*y*C-x*s), 0],
                [(x*z*C-y*s), (y*z*C+x*s),   (z*z*C+c), 0],
                [          0,           0,           0, 1] ];

    this.applyTransform(rot);
  };

  // Apply a translation to current transformation matrix
  Transform3D.prototype.translate = function(x, y, z)
  {
    var trns = [ [1, 0, 0, 0],
                 [0, 1, 0, 0],
                 [0, 0, 1, 0],
                 [x, y, z, 1] ];
    this.applyTransform(trns);
  };

  // Apply a scale to current transformation matrix
  Transform3D.prototype.scale = function(s)
  {
    var as = Math.abs(s);
    var scl = [[as, 0,  0, 0],
               [0, as,  0, 0],
               [0,  0, as, 0],
               [0,  0,  0, 1]];
    this.applyTransform(scl);
  };

  Transform3D.prototype.reset = function()
  {
    this.matrix[0][0] = 1;
    this.matrix[0][1] = 0;
    this.matrix[0][2] = 0;
    this.matrix[0][3] = 0;
    this.matrix[1][0] = 0;
    this.matrix[1][1] = 1;
    this.matrix[1][2] = 0;
    this.matrix[1][3] = 0;
    this.matrix[2][0] = 0;
    this.matrix[2][1] = 0;
    this.matrix[2][2] = 1;
    this.matrix[2][3] = 0;
    this.matrix[3][0] = 0;
    this.matrix[3][1] = 0;
    this.matrix[3][2] = 0;
    this.matrix[3][3] = 1;
  };

  Transform3D.prototype.applyTransform = function(m)
  {
    // apply a transform by multiplying this.matrix by matrix 'm'
    var a11 = this.matrix[0][0];
    var a12 = this.matrix[0][1];
    var a13 = this.matrix[0][2];
    var a14 = this.matrix[0][3];
    var a21 = this.matrix[1][0];
    var a22 = this.matrix[1][1];
    var a23 = this.matrix[1][2];
    var a24 = this.matrix[1][3];
    var a31 = this.matrix[2][0];
    var a32 = this.matrix[2][1];
    var a33 = this.matrix[2][2];
    var a34 = this.matrix[2][3];
    var a41 = this.matrix[3][0];
    var a42 = this.matrix[3][1];
    var a43 = this.matrix[3][2];
    var a44 = this.matrix[3][3];

    var b11 = m[0][0];
    var b12 = m[0][1];
    var b13 = m[0][2];
    var b14 = m[0][3];
    var b21 = m[1][0];
    var b22 = m[1][1];
    var b23 = m[1][2];
    var b24 = m[1][3];
    var b31 = m[2][0];
    var b32 = m[2][1];
    var b33 = m[2][2];
    var b34 = m[2][3];
    var b41 = m[3][0];
    var b42 = m[3][1];
    var b43 = m[3][2];
    var b44 = m[3][3];

    this.matrix[0][0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    this.matrix[0][1] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    this.matrix[0][2] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    this.matrix[0][3] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
    this.matrix[1][0] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    this.matrix[1][1] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    this.matrix[1][2] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    this.matrix[1][3] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
    this.matrix[2][0] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    this.matrix[2][1] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    this.matrix[2][2] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    this.matrix[2][3] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
    this.matrix[3][0] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    this.matrix[3][1] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    this.matrix[3][2] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    this.matrix[3][3] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  };

  Transform3D.prototype.matrixMult = function(a, b)
  {
    var a11 = a[0][0];
    var a12 = a[0][1];
    var a13 = a[0][2];
    var a14 = a[0][3];
    var a21 = a[1][0];
    var a22 = a[1][1];
    var a23 = a[1][2];
    var a24 = a[1][3];
    var a31 = a[2][0];
    var a32 = a[2][1];
    var a33 = a[2][2];
    var a34 = a[2][3];
    var a41 = a[3][0];
    var a42 = a[3][1];
    var a43 = a[3][2];
    var a44 = a[3][3];

    var b11 = b[0][0];
    var b12 = b[0][1];
    var b13 = b[0][2];
    var b14 = b[0][3];
    var b21 = b[1][0];
    var b22 = b[1][1];
    var b23 = b[1][2];
    var b24 = b[1][3];
    var b31 = b[2][0];
    var b32 = b[2][1];
    var b33 = b[2][2];
    var b34 = b[2][3];
    var b41 = b[3][0];
    var b42 = b[3][1];
    var b43 = b[3][2];
    var b44 = b[3][3];

    this.matrix[0][0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    this.matrix[0][1] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    this.matrix[0][2] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    this.matrix[0][3] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
    this.matrix[1][0] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    this.matrix[1][1] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    this.matrix[1][2] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    this.matrix[1][3] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
    this.matrix[2][0] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    this.matrix[2][1] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    this.matrix[2][2] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    this.matrix[2][3] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
    this.matrix[3][0] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    this.matrix[3][1] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    this.matrix[3][2] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    this.matrix[3][3] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  };

  // Generate a 2D translation matrix
  function translateMatrix(x, y, z)
  {
    var trns = [ [1, 0, 0, 0],
                 [0, 1, 0, 0],
                 [0, 0, 1, 0],
                 [x, y, z, 1] ];

    return trns;
  }

  // Generate a 2D rotate matrix, angle in degrees
  function rotateMatrix(vx, vy, vz, angle)
  {
    var t = Math.PI/180.0,
        mag = Math.sqrt(vx*vx + vy*vy + vz*vz),   // calc vector length
        x	= vx/mag,
        y	= vy/mag,
        z	= vz/mag,
        s	= Math.sin(-angle*t),
        c	= Math.cos(-angle*t),
        C	= 1-c,
        // ref: http://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
        rot = [ [  (x*x*C+c), (y*x*C-z*s), (z*x*C+y*s), 0],
                    [(x*y*C+z*s),   (y*y*C+c), (z*y*C-x*s), 0],
                    [(x*z*C-y*s), (y*z*C+x*s),   (z*z*C+c), 0],
                    [          0,           0,           0, 1] ];

    return rot;
  }

  // Generate a 2D revolve (identical to rotate) but may be applied after soft translate.
  function revolveMatrix(vx, vy, vz, angle)
  {
    var t = Math.PI/180.0,
        mag = Math.sqrt(vx*vx + vy*vy + vz*vz),   // calc vector length
        x	= vx/mag,
        y	= vy/mag,
        z	= vz/mag,
        s	= Math.sin(-angle*t),
        c	= Math.cos(-angle*t),
        C	= 1-c,
        // ref: http://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
        rev = [ [  (x*x*C+c), (y*x*C-z*s), (z*x*C+y*s), 0],
                    [(x*y*C+z*s),   (y*y*C+c), (z*y*C-x*s), 0],
                    [(x*z*C-y*s), (y*z*C+x*s),   (z*z*C+c), 0],
                    [          0,           0,           0, 1] ];

    return rev;
  }

  // Generate a 2D scale matrix
  function scaleMatrix(s)
  {
    var as = Math.abs(s),
        scl = [[as, 0,  0, 0],
               [0, as,  0, 0],
               [0,  0, as, 0],
               [0,  0,  0, 1]];

    return scl;
  }

  function StaticTfm(obj)
  {
    var savThis = this;

    this.parent = obj;
    this.translate = function(x, y, z)
    {
      var trns = translateMatrix(x, y, z);
      savThis.parent.ofsTfmAry.push(trns);
    };
    this.scale = function(s)
    {
      var scl = scaleMatrix(s);
      savThis.parent.ofsTfmAry.unshift(scl);
    };
    this.rotate = function(vx, vy, vz, deg)
    {
      var rot = rotateMatrix(vx, vy, vz, deg);
      // put rotate in front of array so there is no move of dwgOrg
      savThis.parent.ofsTfmAry.unshift(rot);
    };
    this.revolve = function(vx, vy, vz, deg)
    {
      var rev = revolveMatrix(vx, vy, vz, deg);
      savThis.parent.ofsTfmAry.push(rev);
    };
    this.reset = function()
    {
      savThis.parent.ofsTfmAry = [];  // clear out the pending transforms
      savThis.parent.ofsTfm.reset();  // reset the accumulation matrix
    };
  }

  /* ====================================================================
   * A 3d coordinate (right handed system)
   *
   * X +ve right
   * Y +ve up
   * Z +ve out screen
   * --------------------------------------------------------------------
   */
  function Point(x, y, z)
  {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;

    // Translated, rotated, scaled
    this.tx = this.x;
    this.ty = this.y;
    this.tz = this.z;

    // tx, ty, tz, projected to 2D as seen from viewpoint
    this.fx = 0;
    this.fy = 0;
  }

  Point.prototype.hardTransform = function(m)
  {
    var a1 = this.x;
    var a2 = this.y;
    var a3 = this.z;
    var a4 = 1;

    var b11 = m[0][0];
    var b12 = m[0][1];
    var b13 = m[0][2];
//    var b14 = m[0][3];
    var b21 = m[1][0];
    var b22 = m[1][1];
    var b23 = m[1][2];
//    var b24 = m[1][3];
    var b31 = m[2][0];
    var b32 = m[2][1];
    var b33 = m[2][2];
//    var b34 = m[2][3];
    var b41 = m[3][0];
    var b42 = m[3][1];
    var b43 = m[3][2];
//    var b44 = m[3][3];

    this.x = this.tx = a1 * b11 + a2 * b21 + a3 * b31 + a4 * b41;
    this.y = this.ty = a1 * b12 + a2 * b22 + a3 * b32 + a4 * b42;
    this.z = this.tz = a1 * b13 + a2 * b23 + a3 * b33 + a4 * b43;
  };

  Point.prototype.softTransform = function(m)
  {
    var a1 = this.x;
    var a2 = this.y;
    var a3 = this.z;
    var a4 = 1;

    var b11 = m[0][0];
    var b12 = m[0][1];
    var b13 = m[0][2];
//    var b14 = m[0][3];
    var b21 = m[1][0];
    var b22 = m[1][1];
    var b23 = m[1][2];
//    var b24 = m[1][3];
    var b31 = m[2][0];
    var b32 = m[2][1];
    var b33 = m[2][2];
//    var b34 = m[2][3];
    var b41 = m[3][0];
    var b42 = m[3][1];
    var b43 = m[3][2];
//    var b44 = m[3][3];

    this.tx = a1 * b11 + a2 * b21 + a3 * b31 + a4 * b41;
    this.ty = a1 * b12 + a2 * b22 + a3 * b32 + a4 * b42;
    this.tz = a1 * b13 + a2 * b23 + a3 * b33 + a4 * b43;
  };


  function Group3D(cgo)
  {
    if (cgo === undefined)     // this is needed to render Group3D children
    {
      return;
    }
    this.cgo = cgo;
    this.parent = null;                 // pointer to parent group if any
    this.children = [];                 // only Group3Ds have children
    this.ofsTfmAry = [];
    this.ofsTfm = new Transform3D();    // Group's offset from any parent Group's current transform
    this.grpTfm = new Transform3D();    // Parent Group's current transform
    this.netTfm = new Transform3D();    // product of parent Group netTfm and this.ofsTfm
    this.dwgOrg = new Point(0, 0, 0);   // drawing origin (0,0,0) may get translated
    this.centroid = new Point();
    this.drawObjs = [];
    // enable obj.transform.rotate etc. API
    this.transform = new StaticTfm(this);
  }

  Group3D.prototype.addObj = function()
  {
    var args = Array.prototype.slice.call(arguments), // grab array of arguments
        xSum = 0,
        ySum = 0,
        zSum = 0,
        numPts = 0,    // total point counter for all commands
        i, j;

    for (i=0; i<args.length; i++)
    {
      if (isArray(args[i]))
      {
        // check that only Group3Ds or Obj3Ds are passed
        for (j=0; j<args[i].length; j++)
        {
          if ((args[i][j].drawCmds !== undefined)||(args[i][j].children !== undefined))
          {
            if (args[i][j].parent != null)      // already a member of a Group2D, remove it
            {
              args[i][j].parent.deleteObj(args[i][j]);
            }
            // point the Obj3D or Group3D parent property at this Group3D
            args[i][j].parent = this;           // now its a free agent link it to this group
            this.children.push(args[i][j]);
          }
        }
      }
      else
      {
        if ((args[i].drawCmds !== undefined)||(args[i].children !== undefined))
        {
          if (args[i].parent != null)       // already a member of a Group2D, remove it
          {
            args[i].parent.deleteObj(args[i]);
          }
          args[i].parent = this;            // now its a free agent link it to this group
          // point the Obj3D or Group3D parent property at this Group3D
          this.children.push(args[i]);
        }
      }
    }
    this.drawObjs = [];   // throw away the old array start fresh
    for (j=0; j<this.children.length; j++)
    {
      if (this.children[j].drawCmds != undefined)  // only Obj3D contribute
      {
        this.drawObjs.push(this.children[j]);     // just push the Obj3Ds into the array to be drawn
        // add the objects centroid to calc group centriod
        xSum += this.children[j].centroid.x;
        ySum += this.children[j].centroid.y;
        zSum += this.children[j].centroid.z;
        numPts++;
      }
    }
    if (numPts)
    {
      this.centroid.x = xSum/numPts;       // get recalculated several times but never if no Obj3Ds
      this.centroid.y = ySum/numPts;
      this.centroid.z = zSum/numPts;
    }
  };

  /*======================================
   * Recursively apply a translation to
   * child Obj3Ds or children of Group3Ds
   * This is a permanent change to
   * do not use for animation, use
   * transform method instead.
   *-------------------------------------*/
  Group3D.prototype.translate = function(x, y, z)
  {
    // now transform the centroid
    var xVal = x || 0,
        yVal = y || 0,
        zVal = z || 0,
        transMat = [ [   1,    0,    0, 0],
                     [   0,    1,    0, 0],
                     [   0,    0,    1, 0],
                     [xVal, yVal, zVal, 1] ];

    function applyXfm(obj)
    {
      // do nothing if array elements are not Obj3Ds
      if (obj.drawCmds === undefined)
      {
        return;
      }
      obj.translate(x, y, z);
    }
    // task:function, grp: group with children
  	function iterate(task, grp)
  	{
  	  var i, childNode;
  		for (i=0; i<grp.children.length; i++)
  		{
        childNode = grp.children[i];
        task(childNode);
  			if ((childNode.children != undefined) && (childNode.children.length > 0))
        {
  				iterate(task, childNode);
        }
  		}
  	}

    // group only has children to tend
    iterate(applyXfm, this);

    this.centroid.hardTransform(transMat);    // translate the centroid
  };

  /*======================================
   * Recursively apply the rotation to
   * children or children of children
   * This is a permanent change to
   * do not use for animation, use
   * transform method instead.
   *-------------------------------------*/
  Group3D.prototype.rotate = function(vx, vy, vz, angle)
  {
    var t = Math.PI/180.0,
        mag = Math.sqrt(vx*vx + vy*vy + vz*vz),   // calc vector length
        x	= vx/mag,
        y	= vy/mag,
        z	= vz/mag,
        s	= Math.sin(-angle*t),
        c	= Math.cos(-angle*t),
        C	= 1-c,
        // ref: http://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
        rotMat = [[  (x*x*C+c), (y*x*C-z*s), (z*x*C+y*s), 0],
                  [(x*y*C+z*s),   (y*y*C+c), (z*y*C-x*s), 0],
                  [(x*z*C-y*s), (y*z*C+x*s),   (z*z*C+c), 0],
                  [          0,           0,           0, 1]];

    function applyXfm(obj)
    {
      // do nothing if array elements are not Obj3Ds
      if (obj.drawCmds === undefined)
      {
        return;
      }
      obj.rotate(vx, vy, vz, angle);
    }
    // task:function, grp: group with children
  	function iterate(task, grp)
  	{
  	  var i, childNode;
  		for(i=0; i<grp.children.length; i++)
  		{
        childNode = grp.children[i];
        task(childNode);
  			if ((childNode.children != undefined) && (childNode.children.length > 0))
        {
  				iterate(task, childNode);
        }
  		}
  	}

    // group only has children to tend
    iterate(applyXfm, this);

    this.centroid.hardTransform(rotMat);    // rotate the centroid
  };

  /*======================================
   * Recursively apply the scaling to
   * children or children of children
   * This is a permanent change to
   * do not use for animation, use
   * transform method instead.
   *-------------------------------------*/
  Group3D.prototype.scale = function(s)
  {
    var sclMat = [ [s, 0, 0, 0],
                   [0, s, 0, 0],
                   [0, 0, s, 0],
                   [0, 0, 0, 1] ];

    function applyXfm(obj)
    {
      // do nothing if array elements are not Obj3Ds
      if (obj.drawCmds === undefined)
      {
        return;
      }
      obj.scale(s);
    }
    // task:function, grp: group with children
  	function iterate(task, grp)
  	{
  	  var x, childNode;
  		for(x=0; x<grp.children.length; x++)
  		{
        childNode = grp.children[x];
        task(childNode);
  			if ((childNode.children != undefined) && (childNode.children.length > 0))
        {
  				iterate(task, childNode);
        }
  		}
  	}

    // group only has children to tend
    iterate(applyXfm, this);

    this.centroid.hardTransform(sclMat);    // scale the centroid
  };

  /*======================================
   * Recursively enable dragging on
   * Obj3D children
   *-------------------------------------*/
  Group3D.prototype.enableDrag = function(drag)
  {
    this.dragNdrop = drag;
    // When rendered all child Obj3D will be added to _draggables to be checked on mousedown
  };

  /*======================================
   * Recursively disable dragging to
   * Obj3D children
   *-------------------------------------*/
  Group3D.prototype.disableDrag = function(drag)
  {
    // Can't immediately remove from _draggables array (no Cango reference) but no harm
    this.dragNdrop = null;
  };


  function Obj3D(cgo, commands, type, col, bkCol)
  {
    var xSum = 0,
        ySum = 0,
        zSum = 0,
        numPts = 0,    // total point counter for all commands
        i;

    this.cgo = cgo;                     // save the Cango context
    this.parent = null;                 // parent Group3D
    this.type = type;                   // PATH, SHAPE, TEXT
    this.drawCmds = commands || [];     // array of DrawCmd3D objects
    this.bBoxCmds = [];              // DrawCmd3D array for the text bounding box
    this.strokeColor = new RGBAColor('black');   // used for PATHs and TEXT
    this.fillColor = new RGBAColor('gray');      // used to fill SHAPEs
    this.backColor = new RGBAColor('steelblue'); //  "    "   "    "
    this.strokeWidth = 1;
    this.strokeCap = "butt";
    this.dwgOrg = new Point(0, 0, 0);   // drawing origin (0,0,0) may get translated
    this.centroid = new Point(0, 0, 0); // average of x, y, z coords
    this.normal = new Point(0, 0, 0);   // from centroid, normal to object plane
    this.textCmds = [];                 // holds DrawCmd3Ds array to draw SHAPE's text label
    this.ofsTfmAry = [];                // accumulate transform matrices to be applied at render
    this.ofsTfm = new Transform3D();    // Obj3D's offset from any parent Group's current transform
    this.grpTfm = new Transform3D();    // Parent Group's current transform
    this.netTfm = new Transform3D();    // product of parent Group netTfm applied to this.ofsTfm
    this.dragNdrop = null;
    // enable obj.transform.rotate etc. API
    this.transform = new StaticTfm(this);

    if ((cgo !== undefined)&&(cgo != null)&&(commands.length))
    {
      var newCol = new RGBAColor(col);
      if (newCol.ok)
      {
        this.fillColor = newCol;
        this.strokeColor = newCol;
      }
      else   // not a color
      {
        this.fillColor = cgo.paintCol;
        this.strokeColor = cgo.penCol;
      }
      // only SHAPEs pass bkCol  (it is ignored for PATHs)
      var newBkCol = new RGBAColor(bkCol);
      if (newBkCol.ok)
      {
        this.backColor = newBkCol;
      }
      else   // not a color
      {
        this.backColor = this.fillColor;
      }

      this.strokeCap = (type ==  "TEXT")? "round": cgo.lineCap;
      this.strokeWidth = cgo.penWid;

      for (i=0; i<this.drawCmds.length; i++)
      {
        if (this.drawCmds[i].ep != undefined)  // check for Z command, has no coords
        {
          xSum += this.drawCmds[i].ep.x;
          ySum += this.drawCmds[i].ep.y;
          zSum += this.drawCmds[i].ep.z;
          numPts++;
        }
      }
      this.centroid.x = xSum/numPts;
      this.centroid.y = ySum/numPts;
      this.centroid.z = zSum/numPts;

      if (this.drawCmds.length > 2)
      {
        // make the normal(o, a, b)  = aXb, = vector from centroid to data[0], b = centroid to data[1]
        this.normal = cgo.calcNormal(this.centroid, this.drawCmds[1].ep, this.drawCmds[2].ep);
        // NOTE: traverse CCW, normal is out of screen (+z), traverse path CW, normal is into screen (-z)
        //make 10 pixels long (independent of world coords
        this.normal.x *= 10/cgo.xscl;
        this.normal.y *= 10/cgo.xscl;
        this.normal.z *= 10/cgo.xscl;
      }
      else
      {
        if (this.drawCmds.length == 2)    // if Bezier it will need a normal
        {
          if (this.drawCmds[1].cPts.length)
          {
            this.normal = cgo.calcNormal(this.centroid, this.drawCmds[1].ep, this.drawCmds[1].cPts[0]);
          }
          else
          {
            // straight line but make a normal for completeness
            this.normal.z = 10/cgo.xscl;
          }
        }
        else
        {
          return;
        }
      }
      // move normal to start from the centroid
      this.normal.x += this.centroid.x;
      this.normal.y += this.centroid.y;
      this.normal.z += this.centroid.z;
    }
  }

  /*=========================================================
   * Obj3D.translate
   * Generate a transform matrix to translate a 3D point
   * away to a position x,y,z from 0,0,0 the drawing origin.
   * Then multiply every point in an Obj3D outline path,
   * along with the centroid and normal, by this matrix.
   * The transformed x,y,z values overwrite the current
   * values.
   *
   * This function should be used in shape
   * construction not animation. Animation doesn't change
   * x,y,z, it uses them to get tx,ty,tz.
   *---------------------------------------------------------
   */
  Obj3D.prototype.translate = function(x, y, z)
  {
    var xVal = x || 0,
        yVal = y || 0,
        zVal = z || 0,
        transMat = [ [   1,    0,    0, 0],
                         [   0,    1,    0, 0],
                         [   0,    0,    1, 0],
                         [xVal, yVal, zVal, 1] ],
        j, k;

    for(j=0; j < this.drawCmds.length; j++)   // step through the draw segments
    {
      for (k=0; k<this.drawCmds[j].cPts.length; k++)   // transform each 3D Point
      {
        this.drawCmds[j].cPts[k].hardTransform(transMat);
      }
      // add the end point (check it exists since 'closePath' has no end point)
      if (this.drawCmds[j].ep != undefined)
      {
        this.drawCmds[j].ep.hardTransform(transMat);
      }
    }
    this.centroid.hardTransform(transMat);    // translate the centroid
    this.normal.hardTransform(transMat);    // translate the normal
    // now transform the text bounding box
    if (this.type == "TEXT")
    {
      // just tranform end points, just moveTo and lineTo (no cPts)
      for(j=0; j < this.bBoxCmds.length; j++)   // step through the draw segments
      {
        // check for ep since 'closePath' has no end point)
        if (this.bBoxCmds[j].ep != undefined)
        {
          this.bBoxCmds[j].ep.hardTransform(transMat);
        }
      }
    }
    // check for labels on SHAPEs
    if (this.textCmds.length>0)
    {
      for(j=0; j<this.textCmds.length; j++)   // step through the draw segments
      {
        for (k=0; k<this.textCmds[j].cPts.length; k++)   // transform each 3D Point
        {
          this.textCmds[j].cPts[k].hardTransform(transMat);
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (this.textCmds[j].ep != undefined)
        {
          this.textCmds[j].ep.hardTransform(transMat);
        }
      }
    }
  };

  /*=========================================================
   * Obj3D.rotate
   * Generate a transformation matrix to rotate a 3D point
   * around the axis defined by vector vx,vy,vz by angle degs.
   * Then multiply every point in an Obj3D outline path,
   * along with the centroid and normal, by this matrix.
   * The transformed x,y,z values overwrite the current
   * values.
   *
   * This function should be used in shape
   * construction not animation. Animation doesn't change
   * x,y,z, it uses them to get tx,ty,tz.
   *---------------------------------------------------------
   */
  Obj3D.prototype.rotate = function(vx, vy, vz, angle)
  {
    var t = Math.PI/180.0,
        mag = Math.sqrt(vx*vx + vy*vy + vz*vz),   // calc vector length
        x	= vx/mag,
        y	= vy/mag,
        z	= vz/mag,
        s	= Math.sin(-angle*t),
        c	= Math.cos(-angle*t),
        C	= 1-c,
        // ref: http://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation
        rotMat = [[  (x*x*C+c), (y*x*C-z*s), (z*x*C+y*s), 0],
                      [(x*y*C+z*s),   (y*y*C+c), (z*y*C-x*s), 0],
                      [(x*z*C-y*s), (y*z*C+x*s),   (z*z*C+c), 0],
                      [          0,           0,           0, 1]],
        j, k;

    for(j=0; j < this.drawCmds.length; j++)   // step through the draw segments
    {
      for (k=0; k<this.drawCmds[j].cPts.length; k++)   // transform each 3D Point
      {
        this.drawCmds[j].cPts[k].hardTransform(rotMat);
      }
      // add the end point (check it exists since 'closePath' has no end point)
      if (this.drawCmds[j].ep != undefined)
      {
        this.drawCmds[j].ep.hardTransform(rotMat);
      }
    }
    this.centroid.hardTransform(rotMat);    // rotate the centroid
    this.normal.hardTransform(rotMat);    // rotate the normal
    // now transform the text bounding box
    if (this.type == "TEXT")
    {
      // just tranform end points, just moveTo and lineTo (no cPts)
      for(j=0; j < this.bBoxCmds.length; j++)   // step through the draw segments
      {
        // check for ep since 'closePath' has no end point)
        if (this.bBoxCmds[j].ep != undefined)
        {
          this.bBoxCmds[j].ep.hardTransform(rotMat);
        }
      }
    }
    // check for labels on SHAPEs
    if (this.textCmds.length > 0)
    {
      for(j=0; j<this.textCmds.length; j++)   // step through the draw segments
      {
        for (k=0; k<this.textCmds[j].cPts.length; k++)   // transform each 3D Point
        {
          this.textCmds[j].cPts[k].hardTransform(rotMat);
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (this.textCmds[j].ep != undefined)
        {
          this.textCmds[j].ep.hardTransform(rotMat);
        }
      }
    }
  };

  /*=========================================================
   * Obj3D.scale
   * Generate a transformation matrix to scale a 3D point
   * relative to its drawing origin.
   * Then multiply every point in an Obj3D outline path,
   * along with the centroid and normal, by this matrix.
   * The transformed x,y,z values overwrite the current
   * values.
   *
   * This function should be used in shape
   * construction not animation. Animation doesn't change
   * x,y,z, it uses them to get tx,ty,tz.
   *---------------------------------------------------------
   */
  Obj3D.prototype.scale = function(s)
  {
    var sclMat = [ [s, 0, 0, 0],
                   [0, s, 0, 0],
                   [0, 0, s, 0],
                   [0, 0, 0, 1] ],
        j, k;

    this.strokeWidth *= s;           // allow line width to scale with objects

    for(j=0; j < this.drawCmds.length; j++)   // step through the draw segments
    {
      for (k=0; k<this.drawCmds[j].cPts.length; k++)   // transform each 3D Point
      {
        this.drawCmds[j].cPts[k].hardTransform(sclMat);
      }
      // add the end point (check it exists since 'closePath' has no end point)
      if (this.drawCmds[j].ep != undefined)
      {
        this.drawCmds[j].ep.hardTransform(sclMat);
      }
    }
    this.centroid.hardTransform(sclMat);    // scale the centroid
    this.normal.hardTransform(sclMat);    // translate the normal
    // now transform the text bounding box
    if (this.type == "TEXT")
    {
      // just tranform end points, just moveTo and lineTo (no cPts)
      for(j=0; j < this.bBoxCmds.length; j++)   // step through the draw segments
      {
        // check for ep since 'closePath' has no end point)
        if (this.bBoxCmds[j].ep != undefined)
        {
          this.bBoxCmds[j].ep.hardTransform(sclMat);
        }
      }
    }
    // check for labels on SHAPEs
    if (this.textCmds.length>0)
    {
      for(j=0; j<this.textCmds.length; j++)   // step through the draw segments
      {
        for (k=0; k<this.textCmds[j].cPts.length; k++)   // transform each 3D Point
        {
          this.textCmds[j].cPts[k].hardTransform(sclMat);
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (this.textCmds[j].ep != undefined)
        {
          this.textCmds[j].ep.hardTransform(sclMat);
        }
      }
    }
  };

  /*======================================
   * Flips the normal to point in opposite
   * direction. Useful if object coordinates
   * track CW. The normal is into screen if
   * outline is traversed CW (RH rule).
   *-------------------------------------*/
  Obj3D.prototype.flipNormal = function()
  {
    var nx = this.normal.x,
        ny = this.normal.y,
        nz = this.normal.z;

    this.normal.x = 2*this.centroid.x - nx;
    this.normal.y = 2*this.centroid.y - ny;
    this.normal.z = 2*this.centroid.z - nz;
  };

  Obj3D.prototype.enableDrag = function(drag)
  {
    this.dragNdrop = drag;
    // When rendered this Obj3D will be added to _draggables to be checked on mousedown
    // the Drag3D has the Cango context saved as 'this.cgo'
    if (!_draggable[drag.cgo.cId].contains(this))
    {
      _draggable[drag.cgo.cId].push(this);
    }
  };

  Obj3D.prototype.disableDrag = function()
  {
    var aidx;

    function getIndex(ary, obj)
    {
      var i, j;
      for (i=0, j=ary.length; i<j; i++)
      {
        if (ary[i] === obj)
        {
          return i;
        }
      }
      return -1;
    }

    if (!this.dragNdrop)
    {
      return;
    }
    // remove this object from array to be checked on mousedown
    // the Drag3D has the cango context saved as 'cgo'
    aidx = getIndex(this.dragNdrop.cgo.draggable, this);
    _draggable[this.dragNdrop.cgo.cId].splice(aidx, 1);
    this.dragNdrop = null;
  };

  Obj3D.prototype.dup = function()
  {
    var newObj = new Obj3D();

    /* create a copy (not just a reference) of an object */
    function clone(obj)
    {
      var nObj = (obj instanceof Array) ? [] : {},
          i;
      for (i in obj)
      {
        if (obj[i] && typeof obj[i] == "object")
        {
          nObj[i] = clone(obj[i]);
        }
        else
        {
          nObj[i] = obj[i];
        }
      }
      return nObj;
    }

    newObj.cgo = this.cgo;
    newObj.type = this.type;
    newObj.drawCmds = clone(this.drawCmds);
    newObj.bBoxCmds = clone(this.bBoxCmds);
    newObj.strokeColor = clone(this.strokeColor);
    newObj.fillColor = clone(this.fillColor);
    newObj.backColor = clone(this.backColor);
    newObj.strokeWidth = this.strokeWidth;
    newObj.strokeCap = this.strokeCap;
    newObj.centroid = clone(this.centroid);
    newObj.normal = clone(this.normal);
    newObj.textCmds = clone(this.textCmds);
    newObj.ofsTfmAry = [];
    newObj.ofsTfm = clone(this.ofsTfm);
    newObj.grpTfm = clone(this.grpTfm);
    newObj.netTfm = clone(this.netTfm);
    newObj.transform = new StaticTfm(newObj);
    newObj.dragNdrop = clone(this.dragNdrop);

    return newObj;
  };

  var CanvasTextFunctions = { };
  //
  // This code is released to the public domain by Jim Studt, 2007.
  // He may keep some sort of up to date copy at http://www.federated.com/~jim/canvastext/
  //

  CanvasTextFunctions.letters = {
      ' ': { width: 16, points: [] },
      '!': { width: 10, points: [[5,21],[5,7],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]] },
      '"': { width: 16, points: [[4,21],[4,14],[-1,-1],[12,21],[12,14]] },
      '#': { width: 21, points: [[11,25],[4,-7],[-1,-1],[17,25],[10,-7],[-1,-1],[4,12],[18,12],[-1,-1],[3,6],[17,6]] },
      '$': { width: 20, points: [[8,25],[8,-4],[-1,-1],[12,25],[12,-4],[-1,-1],[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]] },
      '%': { width: 24, points: [[21,21],[3,0],[-1,-1],[8,21],[10,19],[10,17],[9,15],[7,14],[5,14],[3,16],[3,18],[4,20],[6,21],[8,21],[10,20],[13,19],[16,19],[19,20],[21,21],[-1,-1],[17,7],[15,6],[14,4],[14,2],[16,0],[18,0],[20,1],[21,3],[21,5],[19,7],[17,7]] },
      '&': { width: 26, points: [[23,12],[23,13],[22,14],[21,14],[20,13],[19,11],[17,6],[15,3],[13,1],[11,0],[7,0],[5,1],[4,2],[3,4],[3,6],[4,8],[5,9],[12,13],[13,14],[14,16],[14,18],[13,20],[11,21],[9,20],[8,18],[8,16],[9,13],[11,10],[16,3],[18,1],[20,0],[22,0],[23,1],[23,2]] },
      '\'': { width: 10, points: [[5,19],[4,20],[5,21],[6,20],[6,18],[5,16],[4,15]] },
      '(': { width: 14, points: [[11,25],[9,23],[7,20],[5,16],[4,11],[4,7],[5,2],[7,-2],[9,-5],[11,-7]] },
      ')': { width: 14, points: [[3,25],[5,23],[7,20],[9,16],[10,11],[10,7],[9,2],[7,-2],[5,-5],[3,-7]] },
      '*': { width: 16, points: [[8,21],[8,9],[-1,-1],[3,18],[13,12],[-1,-1],[13,18],[3,12]] },
      '+': { width: 26, points: [[13,18],[13,0],[-1,-1],[4,9],[22,9]] },
      ',': { width: 10, points: [[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]] },
      '-': { width: 26, points: [[4,9],[22,9]] },
      '.': { width: 10, points: [[5,2],[4,1],[5,0],[6,1],[5,2]] },
      '/': { width: 22, points: [[20,25],[2,-7]] },
      '0': { width: 20, points: [[9,21],[6,20],[4,17],[3,12],[3,9],[4,4],[6,1],[9,0],[11,0],[14,1],[16,4],[17,9],[17,12],[16,17],[14,20],[11,21],[9,21]] },
      '1': { width: 20, points: [[6,17],[8,18],[11,21],[11,0]] },
      '2': { width: 20, points: [[4,16],[4,17],[5,19],[6,20],[8,21],[12,21],[14,20],[15,19],[16,17],[16,15],[15,13],[13,10],[3,0],[17,0]] },
      '3': { width: 20, points: [[5,21],[16,21],[10,13],[13,13],[15,12],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]] },
      '4': { width: 20, points: [[13,21],[3,7],[18,7],[-1,-1],[13,21],[13,0]] },
      '5': { width: 20, points: [[15,21],[5,21],[4,12],[5,13],[8,14],[11,14],[14,13],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]] },
      '6': { width: 20, points: [[16,18],[15,20],[12,21],[10,21],[7,20],[5,17],[4,12],[4,7],[5,3],[7,1],[10,0],[11,0],[14,1],[16,3],[17,6],[17,7],[16,10],[14,12],[11,13],[10,13],[7,12],[5,10],[4,7]] },
      '7': { width: 20, points: [[17,21],[7,0],[-1,-1],[3,21],[17,21]] },
      '8': { width: 20, points: [[8,21],[5,20],[4,18],[4,16],[5,14],[7,13],[11,12],[14,11],[16,9],[17,7],[17,4],[16,2],[15,1],[12,0],[8,0],[5,1],[4,2],[3,4],[3,7],[4,9],[6,11],[9,12],[13,13],[15,14],[16,16],[16,18],[15,20],[12,21],[8,21]] },
      '9': { width: 20, points: [[16,14],[15,11],[13,9],[10,8],[9,8],[6,9],[4,11],[3,14],[3,15],[4,18],[6,20],[9,21],[10,21],[13,20],[15,18],[16,14],[16,9],[15,4],[13,1],[10,0],[8,0],[5,1],[4,3]] },
      ':': { width: 10, points: [[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]] },
      ';': { width: 10, points: [[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]] },
      '<': { width: 24, points: [[20,18],[4,9],[20,0]] },
      '=': { width: 26, points: [[4,12],[22,12],[-1,-1],[4,6],[22,6]] },
      '>': { width: 24, points: [[4,18],[20,9],[4,0]] },
      '?': { width: 18, points: [[3,16],[3,17],[4,19],[5,20],[7,21],[11,21],[13,20],[14,19],[15,17],[15,15],[14,13],[13,12],[9,10],[9,7],[-1,-1],[9,2],[8,1],[9,0],[10,1],[9,2]] },
      '@': { width: 27, points: [[18,13],[17,15],[15,16],[12,16],[10,15],[9,14],[8,11],[8,8],[9,6],[11,5],[14,5],[16,6],[17,8],[-1,-1],[12,16],[10,14],[9,11],[9,8],[10,6],[11,5],[-1,-1],[18,16],[17,8],[17,6],[19,5],[21,5],[23,7],[24,10],[24,12],[23,15],[22,17],[20,19],[18,20],[15,21],[12,21],[9,20],[7,19],[5,17],[4,15],[3,12],[3,9],[4,6],[5,4],[7,2],[9,1],[12,0],[15,0],[18,1],[20,2],[21,3],[-1,-1],[19,16],[18,8],[18,6],[19,5]] },
      'A': { width: 18, points: [[9,21],[1,0],[-1,-1],[9,21],[17,0],[-1,-1],[4,7],[14,7]] },
      'B': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[-1,-1],[4,11],[13,11],[16,10],[17,9],[18,7],[18,4],[17,2],[16,1],[13,0],[4,0]] },
      'C': { width: 21, points: [[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5]] },
      'D': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[11,21],[14,20],[16,18],[17,16],[18,13],[18,8],[17,5],[16,3],[14,1],[11,0],[4,0]] },
      'E': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11],[-1,-1],[4,0],[17,0]] },
      'F': { width: 18, points: [[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11]] },
      'G': { width: 21, points: [[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[18,8],[-1,-1],[13,8],[18,8]] },
      'H': { width: 22, points: [[4,21],[4,0],[-1,-1],[18,21],[18,0],[-1,-1],[4,11],[18,11]] },
      'I': { width: 8, points: [[4,21],[4,0]] },
      'J': { width: 16, points: [[12,21],[12,5],[11,2],[10,1],[8,0],[6,0],[4,1],[3,2],[2,5],[2,7]] },
      'K': { width: 21, points: [[4,21],[4,0],[-1,-1],[18,21],[4,7],[-1,-1],[9,12],[18,0]] },
      'L': { width: 17, points: [[4,21],[4,0],[-1,-1],[4,0],[16,0]] },
      'M': { width: 24, points: [[4,21],[4,0],[-1,-1],[4,21],[12,0],[-1,-1],[20,21],[12,0],[-1,-1],[20,21],[20,0]] },
      'N': { width: 22, points: [[4,21],[4,0],[-1,-1],[4,21],[18,0],[-1,-1],[18,21],[18,0]] },
      'O': { width: 22, points: [[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21]] },
      'P': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,14],[17,12],[16,11],[13,10],[4,10]] },
      'Q': { width: 22, points: [[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21],[-1,-1],[12,4],[18,-2]] },
      'R': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[4,11],[-1,-1],[11,11],[18,0]] },
      'S': { width: 20, points: [[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]] },
      'T': { width: 16, points: [[8,21],[8,0],[-1,-1],[1,21],[15,21]] },
      'U': { width: 22, points: [[4,21],[4,6],[5,3],[7,1],[10,0],[12,0],[15,1],[17,3],[18,6],[18,21]] },
      'V': { width: 18, points: [[1,21],[9,0],[-1,-1],[17,21],[9,0]] },
      'W': { width: 24, points: [[2,21],[7,0],[-1,-1],[12,21],[7,0],[-1,-1],[12,21],[17,0],[-1,-1],[22,21],[17,0]] },
      'X': { width: 20, points: [[3,21],[17,0],[-1,-1],[17,21],[3,0]] },
      'Y': { width: 18, points: [[1,21],[9,11],[9,0],[-1,-1],[17,21],[9,11]] },
      'Z': { width: 20, points: [[17,21],[3,0],[-1,-1],[3,21],[17,21],[-1,-1],[3,0],[17,0]] },
      '[': { width: 14, points: [[4,25],[4,-7],[-1,-1],[5,25],[5,-7],[-1,-1],[4,25],[11,25],[-1,-1],[4,-7],[11,-7]] },
      '\\': { width: 14, points: [[0,21],[14,-3]] },
      ']': { width: 14, points: [[9,25],[9,-7],[-1,-1],[10,25],[10,-7],[-1,-1],[3,25],[10,25],[-1,-1],[3,-7],[10,-7]] },
      '^': { width: 16, points: [[6,15],[8,18],[10,15],[-1,-1],[3,12],[8,17],[13,12],[-1,-1],[8,17],[8,0]] },
      '_': { width: 16, points: [[0,-2],[16,-2]] },
      '`': { width: 10, points: [[6,21],[5,20],[4,18],[4,16],[5,15],[6,16],[5,17]] },
      'a': { width: 19, points: [[15,14],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
      'b': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]] },
      'c': { width: 18, points: [[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
      'd': { width: 19, points: [[15,21],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
      'e': { width: 18, points: [[3,8],[15,8],[15,10],[14,12],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
      'f': { width: 12, points: [[10,21],[8,21],[6,20],[5,17],[5,0],[-1,-1],[2,14],[9,14]] },
      'g': { width: 19, points: [[15,14],[15,-2],[14,-5],[13,-6],[11,-7],[8,-7],[6,-6],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
      'h': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]] },
      'i': { width: 8, points: [[3,21],[4,20],[5,21],[4,22],[3,21],[-1,-1],[4,14],[4,0]] },
      'j': { width: 10, points: [[5,21],[6,20],[7,21],[6,22],[5,21],[-1,-1],[6,14],[6,-3],[5,-6],[3,-7],[1,-7]] },
      'k': { width: 17, points: [[4,21],[4,0],[-1,-1],[14,14],[4,4],[-1,-1],[8,8],[15,0]] },
      'l': { width: 8, points: [[4,21],[4,0]] },
      'm': { width: 30, points: [[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0],[-1,-1],[15,10],[18,13],[20,14],[23,14],[25,13],[26,10],[26,0]] },
      'n': { width: 19, points: [[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]] },
      'o': { width: 19, points: [[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3],[16,6],[16,8],[15,11],[13,13],[11,14],[8,14]] },
      'p': { width: 19, points: [[4,14],[4,-7],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]] },
      'q': { width: 19, points: [[15,14],[15,-7],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
      'r': { width: 13, points: [[4,14],[4,0],[-1,-1],[4,8],[5,11],[7,13],[9,14],[12,14]] },
      's': { width: 17, points: [[14,11],[13,13],[10,14],[7,14],[4,13],[3,11],[4,9],[6,8],[11,7],[13,6],[14,4],[14,3],[13,1],[10,0],[7,0],[4,1],[3,3]] },
      't': { width: 12, points: [[5,21],[5,4],[6,1],[8,0],[10,0],[-1,-1],[2,14],[9,14]] },
      'u': { width: 19, points: [[4,14],[4,4],[5,1],[7,0],[10,0],[12,1],[15,4],[-1,-1],[15,14],[15,0]] },
      'v': { width: 16, points: [[2,14],[8,0],[-1,-1],[14,14],[8,0]] },
      'w': { width: 22, points: [[3,14],[7,0],[-1,-1],[11,14],[7,0],[-1,-1],[11,14],[15,0],[-1,-1],[19,14],[15,0]] },
      'x': { width: 17, points: [[3,14],[14,0],[-1,-1],[14,14],[3,0]] },
      'y': { width: 16, points: [[2,14],[8,0],[-1,-1],[14,14],[8,0],[6,-4],[4,-6],[2,-7],[1,-7]] },
      'z': { width: 17, points: [[14,14],[3,0],[-1,-1],[3,14],[14,14],[-1,-1],[3,0],[14,0]] },
      '{': { width: 14, points: [[9,25],[7,24],[6,23],[5,21],[5,19],[6,17],[7,16],[8,14],[8,12],[6,10],[-1,-1],[7,24],[6,22],[6,20],[7,18],[8,17],[9,15],[9,13],[8,11],[4,9],[8,7],[9,5],[9,3],[8,1],[7,0],[6,-2],[6,-4],[7,-6],[-1,-1],[6,8],[8,6],[8,4],[7,2],[6,1],[5,-1],[5,-3],[6,-5],[7,-6],[9,-7]] },
      '|': { width: 8, points: [[4,25],[4,-7]] },
      '}': { width: 14, points: [[5,25],[7,24],[8,23],[9,21],[9,19],[8,17],[7,16],[6,14],[6,12],[8,10],[-1,-1],[7,24],[8,22],[8,20],[7,18],[6,17],[5,15],[5,13],[6,11],[10,9],[6,7],[5,5],[5,3],[6,1],[7,0],[8,-2],[8,-4],[7,-6],[-1,-1],[8,8],[6,6],[6,4],[7,2],[8,1],[9,-1],[9,-3],[8,-5],[7,-6],[5,-7]] },
      '~': { width: 24, points: [[3,6],[3,8],[4,11],[6,12],[8,12],[10,11],[14,8],[16,7],[18,7],[20,8],[21,10],[-1,-1],[3,8],[4,10],[6,11],[8,11],[10,10],[14,7],[16,6],[18,6],[20,7],[21,10],[21,12]] }
  };

  CanvasTextFunctions.letter = function(ch)
  {
    return CanvasTextFunctions.letters[ch];
  };

  CanvasTextFunctions.measure = function(size, str)
  {
    var total = 0;
    var len = str.length;
    var i, c;
    for (i=0; i<len; i++)
    {
    	c = CanvasTextFunctions.letter(str.charAt(i));
    	if (c)
      {
        total += c.width * size / 25.0;
      }
    }

    return total;
  };

  /* =============================================================
   * DrawCmd3D
   * - drawFn: String, the canvas draw command name
   * - cPts: Array, [Point, Point ...] Bezier curve control points
   * - ep: Point, end point of the drawFn
   *-------------------------------------------------------------*/
  function DrawCmd3D(cmdStr, controlPoints, endPoint)
  {
    this.drawFn = cmdStr;             // String version of the canvas command to call
    this.cPts = controlPoints || [];  // [Point, Point ...] Bezier curve control points
    this.ep = endPoint;               // Point will  be undefined for 'closePath' drawFn
    this.parms = [];                  // 2D world coordinate version of cPts and ep
    this.parmsPx = [];                // 2D pixel coordinate version of cPts and ep
  }

  Cango3D = function(canvasId)
  {
    this.cId = canvasId;
    this.cnvs = document.getElementById(canvasId);
    this.rawWidth = this.cnvs.offsetWidth;
    this.rawHeight = this.cnvs.offsetHeight;
    this.aRatio = this.rawWidth/this.rawHeight;

    if (!_resized.hasOwnProperty(this.cId))
    {
      /* Note: rawWidth and rawHeight are floats, assignment to ints will truncate */
      this.cnvs.setAttribute('width', this.rawWidth);   // reset the number of graphics pixels
      this.cnvs.setAttribute('height', this.rawHeight); // use this instead of style
      /* create a reference in gloable array to show this canvas has been resized,
         to prevent repeated resize (which would erase previous drawing as well as waste time). */
      _resized[this.cId]= true;
      // create an array to hold all the draggable objects for each canvas
      _draggable[this.cId] = [];
    }

    this.ctx = this.cnvs.getContext('2d');
    this.ctx.save();

    this.vpW = this.rawWidth;         // vp width in pixels (default to full canvas size)
    this.vpH = this.rawHeight;        // vp height in pixels
    this.vpLLx = 0;                   // vp lower left from canvas left in pixels
    this.vpLLy = this.rawHeight;      // vp lower left from canvas top
    this.xscl = this.rawWidth/100;    // world x axis scale factor, default: canvas width = 100 units
    this.yscl = -this.rawWidth/100;   // world y axis scale factor, default +ve up and
                                      // canvas height =100*aspect ratio (square pixels)
    this.xoffset = 0;                 // world x origin offset from viewport left in pixels
    this.yoffset = 0;                 // world y origin offset from viewport bottom in pixels
                                      // *** to move to world coord x ***
                                      // 1. from pixel x origin (canvas left) add vpLLx (gets to viewport left)
                                      // 2. add xoffset to get to pixel location of world x origin
                                      // 3. add x*xscl pixels to get to world x location.
                                      // ie x (in world coords) ==> vpLLx + xoffset + x*xscl (pixels)
                                      //    y (in world coords) ==> vpLLy + yoffset + y*xscl (pixels)

    this.penCol = new RGBAColor("rgb(0,0,0)");
    this.penWid = 1;            // pixels
    this.lineCap = "butt";
    this.paintCol = new RGBAColor("rgb(128,128,128)");
    this.fontSize = 10;         // 10pt
    this.fontWeight = 400;      // 100 .. 900 (400 normal, 700 bold)
    this.fov = 45;              // 45 deg looks better. 60 is absolute max for good perspective effect
    this.viewpointDistance = this.rawWidth/(this.xscl*Math.tan(this.fov*Math.PI/360)); // world coords
    this.lightSource = {x:0, y:100, z:500};     // world coords
    this.plotNormals = false;   // diagnostic, if true green (toward) or red (away) normals are drawn

    var savThis = this;

    this.cnvs.onmousedown = function(evt)
    {
      var event, csrPos, testObj, len, j;

      function getCursorPos(event)
      {
        // pass in any mouse event, returns the position of the cursor in raw pixel coords
        var rect = savThis.cnvs.getBoundingClientRect();

        return {x: event.clientX - rect.left, y: event.clientY - rect.top};
      }

      function hitTest(pathObj)
      {
        var i;
        // create the path (don't stroke it - no-one will see) to test for hit
        savThis.ctx.beginPath();
        if (pathObj.type == 'TEXT')   // use bounding box not drawCmds
        {
          for (i=0; i<pathObj.bBoxCmds.length; i++)
          {
            savThis.ctx[pathObj.bBoxCmds[i].drawFn].apply(savThis.ctx, pathObj.bBoxCmds[i].parmsPx);
          }
        }
        else
        {
          for (i=0; i<pathObj.drawCmds.length; i++)
          {
            savThis.ctx[pathObj.drawCmds[i].drawFn].apply(savThis.ctx, pathObj.drawCmds[i].parmsPx);
          }
        }
/*
    // for diagnostics on hit region, uncomment
    savThis.ctx.strokeStyle = 'red';
    savThis.ctx.lineWidth = 4;
    savThis.ctx.stroke();
*/
        return savThis.ctx.isPointInPath(csrPos.x, csrPos.y);
      }

      event = evt || window.event;
      csrPos = getCursorPos(event);  // savThis is any Cango ctx on the canvas
      len = _draggable[savThis.cId].length;
      // run through all the registered objects and test if cursor pos is in their path
      for (j = len-1; j >= 0; j--)       // search last drawn first, it will be on top
      {
        testObj = _draggable[savThis.cId][j];    // for readability, could be Obj3D or Group3D
        if (hitTest(testObj))
        {
          // call the grab handler for this object (check it is still enabled)
          if (testObj.dragNdrop)
          {
            testObj.dragNdrop.grab(event, testObj);
            break;      // only worry about the first drag enabled object
          }
          if ((testObj.parent)&&(testObj.parent.dragNdrop))
          {
            testObj.parent.dragNdrop.grab(event, testObj);
            break;
          }
        }
      }
    };
  };

  Cango3D.prototype.toPixelCoords3D = function(x, y, z)
  {
    // transform x,y,z in world coords to canvas pixel coords (top left is 0,0,0 y axis +ve down)
    var xPx = this.vpLLx+this.xoffset+x*this.xscl,
        yPx = this.vpLLy+this.yoffset+y*this.yscl,
        zPx = z*this.xscl;

    return {x: xPx, y: yPx, z:zPx};
  };

  Cango3D.prototype.toWorldCoords3D = function(xPx, yPx, zPx)
  {
    // transform xPx,yPx,zPx in raw canvas pixels to world coords (lower left is 0,0 +ve up)
    var xW = (xPx - this.vpLLx - this.xoffset)/this.xscl,
        yW = (yPx - this.vpLLy - this.yoffset)/this.yscl,
        zW = zPx/this.xscl;

    return {x: xW, y: yW, z:zW};
  };

  Cango3D.prototype._getCursorPos = function(evt)
  {
    // pass in any mouse event, returns the position of the cursor in raw pixel coords
    var e = evt||window.event,
        rect = this.cnvs.getBoundingClientRect();

    return {x: e.clientX - rect.left, y: e.clientY - rect.top, z:0};
  };

  Cango3D.prototype._getCursorPosWC = function(evt)
  {
    // pass in any mouse event, returns the position of the cursor in raw pixel coords
    var e = evt||window.event,
        rect = this.cnvs.getBoundingClientRect(),
        xW = (e.clientX - rect.left - this.vpLLx - this.xoffset)/this.xscl,
        yW = (e.clientY - rect.top - this.vpLLy - this.yoffset)/this.yscl;

    return {x: xW, y: yW, z: 0};
  };

  Cango3D.prototype.clearCanvas = function(fillColor)
  {
    if (fillColor != undefined)
    {
      this.ctx.save();            // going to change fillStyle, save current
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(0, 0, this.rawWidth, this.rawHeight);
      this.ctx.restore();
    }
    else
    {
      this.ctx.clearRect(0, 0, this.rawWidth, this.rawHeight);
    }
    // all drawing erased, but graphics contexts remain intact
    // clear the draggable array, draggables put back when rendered
    _draggable[this.cId].length = 0;
  };

  Cango3D.prototype.setWorldCoords3D = function(leftX, lowerY, spanX)
  {
    if (spanX >0)
    {
      this.xscl = this.vpW/spanX;
      this.yscl = -this.xscl;
      this.xoffset = -leftX*this.xscl;
      this.yoffset = -lowerY*this.yscl;
    }
    else
    {
      this.xscl = this.rawWidth/100;    // makes xaxis = 100 native units
      this.yscl = -this.rawWidth/100;   // makes yaxis = 100*aspect ratio ie. square pixels
      this.xoffset = 0;
      this.yoffset = 0;
    }
    this.setFOV(this.fov);              // reset the viewpoint distance in world coords
  };

  Cango3D.prototype.setPropertyDefault = function(propertyName, value)
  {
    var newCol;

    if ((typeof propertyName != "string")||(value === undefined)||(value == null))
    {
      return;
    }
    switch (propertyName.toLowerCase())
    {
      case "backgroundcolor":
        newCol = new RGBAColor(value);
        if (newCol.ok)
        {
          this.cnvs.style.backgroundColor = newCol.toRGBA();
        }
        break;
      case "fillcolor":
        newCol = new RGBAColor(value);
        if (newCol.ok)
        {
          this.paintCol = newCol;
        }
        break;
      case "strokecolor":
        newCol = new RGBAColor(value);
        if (newCol.ok)
        {
          this.penCol = newCol;
        }
        break;
      case "strokewidth":
        this.penWid = value;
        this.ctx.lineWidth = this.penWid;
        break;
      case "linecap":
        if (typeof value != "string")
        {
          return;
        }
        if ((value == "butt")||(value =="round")||(value == "square"))
        {
          this.lineCap = value;
        }
        this.ctx.lineCap = this.lineCap;
        break;
      case "fontsize":
        this.fontSize = value;
        break;
      case "fontweight":
        if ((value >= 100)&&(value <= 900))
        {
          this.fontWeight = value;
        }
        break;
      default:
        return;
    }
  };

  Cango3D.prototype.setFOV = function(deg)  // viewpoint distance in world coords
  {
    var savThis = this;

    function FOVtoVPD(fov)
    {
      var w = savThis.rawWidth;
      var ll = savThis.xoffset;
      var x, fon2;

      if (ll<0)
      {
        ll = 0;
      }
      if  (ll>w)
      {
        ll = w;
      }

      x = Math.abs(w/2 - ll) + w/2;
      x /= savThis.xscl;                //

      fon2 = Math.PI*fov/(360);

      return x/Math.tan(fon2);
    }

    // set field of view <60deg for good perspective
    if ((deg <= 60)&&(deg>=20))
    {
      this.fov = deg;
      this.viewpointDistance = FOVtoVPD(this.fov);
    }
  };

  Cango3D.prototype.setLightSource = function(x, y, z)    // x, y, z in world coords
  {
    if ((x != undefined)&&(y != undefined)&&(z != undefined))
    {
      this.lightSource.x = x;
      this.lightSource.y = y;
      this.lightSource.z = z;
    }
  };

  // this method allows the Object Group3D to be passed the Cango3D environment
  Cango3D.prototype.createGroup3D = function()
  {
    var grp = new Group3D(this);
    grp.addObj.apply(grp, arguments);

    return grp;
  };

  Cango3D.prototype.compilePath3D = function(path, color, lineWidth, scl)
  {
    var segs = [],
        scale = 1,
        xOfs = 0,                 // move the shape reference point
        yOfs = 0,
        zOfs = 0,
        commands,
        obj,
        i, j;

    // this expects an array of Cgo3D Path syntax letters and numbers
    // which are converted to segs (segment arrays)
    // segs = [ ['M',x,y,z], ['L',x,y,z,x,y,z],['C',x,y,z,x,y,z ..], [], []... ];
    // which are then compiled to canvas drawCmd objects ready to render
    if (!(path instanceof Array))
    {
      return;
    }
    for(j=0, i=1; i<path.length; i++)
    {
      if (typeof path[i] == 'string')
      {
        segs.push(path.slice(j,i));
        j = i;
      }
    }
    segs.push(path.slice(j,i));    // push the last command out
    // now send these off to the svg segs-to-canvas DrawCmd processor
    // now send these off to the svg segs-to-canvas DrawCmd processor
    if ((scl !== undefined)&&(scl>0))
    {
      scale *= scl;
    }
    commands = this._cgo3DtoDrawCmd3D(segs, xOfs, yOfs, zOfs, scale);
    obj = new Obj3D(this, commands, "PATH", color, null);
    obj.strokeWidth = lineWidth || this.penWid;

    return obj;   // object of type Obj3D
  };

  Cango3D.prototype.compileShape3D = function(path, fillColor, bkCol, scl)
  {
    var segs = [],
        scale = 1,
        xOfs = 0,                 // move the shape reference point
        yOfs = 0,
        zOfs = 0,
        commands,
        obj,
        i, j;

    // this expects an array of Cgo3D Path syntax letters and numbers
    // which are converted to segs (segment arrays)
    // segs = [ ['M',x,y,z], ['L',x,y,z,x,y,z],['C',x,y,z,x,y,z ..], [], []... ];
    // which are then compiled to canvas drawCmd objects ready to render
    if (!(path instanceof Array))
    {
      return;
    }
    for(j=0, i=1; i<path.length; i++)
    {
      if (typeof path[i] == 'string')
      {
        segs.push(path.slice(j,i));
        j = i;
      }
    }
    segs.push(path.slice(j,i));    // push the last command out
    // now send these off to the svg segs-to-canvas DrawCmd processor
    if ((scl !== undefined)&&(scl>0))
    {
      scale *= scl;
    }
    commands = this._cgo3DtoDrawCmd3D(segs, xOfs, yOfs, zOfs, scale);
    obj = new Obj3D(this, commands, "SHAPE", fillColor, bkCol);

    return obj;   // object of type Obj3D
  };

  Cango3D.prototype.compileText3D = function(str, color, ptSize, fontWt, lorigin)
  {
    var obj,
        lorg = lorigin || 1,
        size = ptSize || this.fontSize,
        lineWidth = 0.08*size,          // 'normal=400' (see CanvasTextFuctions.draw)
        weight = this.fontWeight,       // default
        mag,
        cmdObj,
        commands = [],
        cPts, ep,
        wid, hgt, wid2, hgt2,
        lorgWC,
        dx, dy,
        i, j, a, c,
        penUp,
        ul, ur, ll, lr;

    size /= this.xscl;    // independent of world coord scaling, set size by point size
    mag = size/25;    // size/25 is worlds coords scaled to stored font size
    wid = CanvasTextFunctions.measure(size, str);
    hgt = 0.84*size;
    /* Note: char cell is 33 pixels high, char size is 21 pixels (0 to 21), decenders go to -7 to 21.
       passing 'size' to text function scales char height by size/25.
       So reference height for vertically alignment is charHeight = 21/25 (=0.84) of the fontSize. */
    wid2 = wid/2;
    hgt2 = hgt/2;
    lorgWC = [0, [0, hgt],  [wid2, hgt],  [wid, hgt],
                 [0, hgt2], [wid2, hgt2], [wid, hgt2],
                 [0, 0],    [wid2, 0],    [wid, 0]    ];
    dx = -lorgWC[lorg][0];
    dy = -lorgWC[lorg][1];

    for (i=0; i<str.length; i++)
    {
      c = CanvasTextFunctions.letter(str.charAt(i));
      if (!c)
      {
        continue;
      }
      penUp = 1;
      for (j=0; j<c.points.length; j++)
      {
        a = c.points[j];
        if ((a[0] == -1) && (a[1] == -1))
        {
          penUp = 1;
          continue;
        }
        if (penUp == 1)
        {
          cPts = [];
          ep = new Point(dx + a[0]*mag, dy + a[1]*mag, 0);
          cmdObj = new DrawCmd3D('moveTo', cPts, ep);
          commands.push(cmdObj);
          penUp = 0;
        }
        else
        {
          cPts = [];
          ep = new Point(dx + a[0]*mag, dy + a[1]*mag, 0);
          cmdObj = new DrawCmd3D('lineTo', cPts, ep); // any coord pair after first move is regarded as line
          commands.push(cmdObj);
        }
      }
      dx += c.width*mag;
    }

    obj = new Obj3D(this, commands, "TEXT", color, null);

    if (isNumber(fontWt) && (fontWt > 99) && (fontWt < 901))
    {
      weight = fontWt;           // 100 .. 900
    }
    obj.strokeWidth = lineWidth*weight/400;    // normal weight stroke width is saved
    // now calc the 4 corners of the bounding box
    ul = new Point(-dx, -dy, 0);
    ur = new Point(-dx+wid, -dy, 0);
    ll = new Point(-dx, -dy-hgt, 0);
    lr = new Point(-dx+wid, -dy-hgt, 0);
    // construct the DrawCmd3Ds for the text bounding box
    obj.bBoxCmds[0] = new DrawCmd3D("moveTo", [], ul);
    obj.bBoxCmds[1] = new DrawCmd3D("lineTo", [], ll);
    obj.bBoxCmds[2] = new DrawCmd3D("lineTo", [], lr);
    obj.bBoxCmds[3] = new DrawCmd3D("lineTo", [], ur);
    obj.bBoxCmds[4] = new DrawCmd3D("closePath", []);
    // calc better centroid and normal
    obj.centroid.x = ul.x + wid/2;
    obj.centroid.y = ul.y - hgt/2;
    obj.centroid.z = 0;
    obj.normal.x = obj.centroid.x;
    obj.normal.y = obj.centroid.y;
    obj.normal.z = 10/this.xscl;

    return obj;
  };

  Cango3D.prototype._compileText = function(str, x, y, ptSize, lorigin)
  {
    var lorg = lorigin || 1,
        size = ptSize || this.fontSize,
        mag,
        cmdObj,
        commands = [],
        cPts, ep,
        wid, hgt, wid2, hgt2,
        lorgWC,
        dx, dy,
        i, j, a, c,
        penUp;

    size /= this.xscl;    // independent of world coord scaling, set size by point size
    mag = size/25;    // size/25 is worlds coords scaled to stored font size
    wid = CanvasTextFunctions.measure(size, str);
    hgt = 0.84*size;
    /* Note: char cell is 33 pixels high, char size is 21 pixels (0 to 21), decenders go to -7 to 21.
       passing 'size' to text function scales char height by size/25.
       So reference height for vertically alignment is charHeight = 21/25 (=0.84) of the fontSize. */
    wid2 = wid/2;
    hgt2 = hgt/2;
    lorgWC = [0, [0, hgt],  [wid2, hgt],  [wid, hgt],
                     [0, hgt2], [wid2, hgt2], [wid, hgt2],
                     [0, 0],    [wid2, 0],    [wid, 0]];
    dx = x-lorgWC[lorg][0];
    dy = y-lorgWC[lorg][1];

    for (i=0; i<str.length; i++)
    {
      c = CanvasTextFunctions.letter(str.charAt(i));
      if (!c)
      {
        continue;
      }

      penUp = true;
      for (j=0; j<c.points.length; j++)
      {
        a = c.points[j];
        if ((a[0] == -1) && (a[1] == -1))
        {
          penUp = true;
          continue;
        }
        if (penUp)
        {
          cPts = [];
          ep = new Point(dx + a[0]*mag, dy + a[1]*mag, 0);
          cmdObj = new DrawCmd3D('moveTo', cPts, ep);
          commands.push(cmdObj);
          penUp = false;
        }
        else
        {
          cPts = [];
          ep = new Point(dx + a[0]*mag, dy + a[1]*mag, 0);
          cmdObj = new DrawCmd3D('lineTo', cPts, ep); // any coord pair after first move is a line
          commands.push(cmdObj);
        }
      }
      dx += c.width*mag;
    }

    return commands;
  };

  Cango3D.prototype.labelShape = function(obj, str, x, y, ptSize, fontWt, lorigin, color)
  {
    var newCol,
        size = ptSize || this.fontSize,
        weight = 400,             // default = 400
        lineWidth = 0.08*size;    // 'normal=400' (see CanvasTextFuctions.draw)

    if ((typeof str != 'string')||(obj.type != "SHAPE"))
    {
      return null;
    }
    if (str.length == 0)
    {
      // remove label any labels from the shape
      obj.textCmds = [];
      obj.lineWidth = 1;
    }
    obj.textCmds = this._compileText(str, x, y, ptSize, lorigin);  // replace existing label (if any)
    newCol = new RGBAColor(color);
    if (newCol.ok)
    {
      obj.strokeColor = newCol;
    }
    else
    {
      obj.strokeColor = this.penCol;
    }
    if (typeof fontWt == 'string')
    {
      weight = fontWt;           // 'bold' etc
    }
    else
    {
      if (isNumber(fontWt) && (fontWt > 99) && (fontWt < 901))
      {
        weight = fontWt;           // 100 .. 900
      }
    }

    obj.strokeWidth = lineWidth*weight/400; // normal weight stroke width is saved
  };

  Cango3D.prototype.appendLabel = function(obj, str, x, y, ptSize, lorigin)
  {
    var commands;

    if ((typeof str != 'string')||!(str.length)||(obj.type != "SHAPE"))
    {
      return null;
    }
    commands = this._compileText(str, x, y, ptSize, lorigin);
    obj.textCmds = obj.textCmds.concat(commands);  // add to existing label (if any)
  };

  /*=========================================================
   * JSONtoObj3D
   * Convert the JS object parsed from JSON string into
   * an Obj3D or Group3D of Obj3D.
   * usage:
   * (load a file as a string into 'var jsonStr')
   * var jsonData = JSON.parse(jsonStr);
   * obj = cgo.JSONtoObj3D(jsonData);
   *---------------------------------------------------------
   */
  Cango3D.prototype.JSONtoObj3D = function(jsonData)
  {
    var savThis = this,
        output,
        data;

    function makeObj(data)
    {
      var obj,
          fillCol = data.fillColor || null,
          strokeCol = data.strokeColor || null,
          backCol = data.backColor || null,
          textCol = data.strokeColor || 'black',
          lineWid = data.strokeWidth || 1,
          segs = [],
          bbox,
          i, j;

      if (data.type == "GROUP")
      {
        obj = savThis.createGroup3D();
      }
      else if (data.type == "PATH")
      {
        obj = savThis.compilePath3D(data.pathData, strokeCol, lineWid);
      }
      else if (data.type == "SHAPE")
      {
        obj = savThis.compileShape3D(data.pathData, fillCol, backCol);
        if (data.textData != undefined)
        {
          obj.strokeColor = new RGBAColor(textCol);
          obj.strokeWidth = lineWid;
          // textData is in JSON format, convert back to drawCmds
          // break into single command segments
          for(j=0, i=1; i<data.textData.length; i++)
          {
            if (typeof data.textData[i] == 'string')
            {
              segs.push(data.textData.slice(j,i));
              j = i;
            }
          }
          segs.push(data.textData.slice(j,i));    // push the last command out
          // convert segs to canvas DrawCmd3D, save result
          obj.textCmds = savThis._cgo3DtoDrawCmd3D(segs);
        }
      }
      else if (data.type == "TEXT")
      {
        // treat text as a special case of PATH, first make a path Obj3D from the stroke data
        obj = savThis.compilePath3D(data.pathData, strokeCol, lineWid);
        obj.type = "TEXT";         // make it TEXT
        // convert the text bounding box back into DrawCmd3Ds
        bbox = savThis.compilePath3D(data.textBoxData);
        obj.bBoxCmds = bbox.drawCmds;
      }
      // save the name if any
      if (data.name)
      {
        obj.name = data.name.slice(0);
      }
      if (data.lineCap)
      {
        obj.strokeCap = data.lineCap.slice(0);
      }
      //  overwrite the calculated centroid and normal (saved will handle flipNormal)
      if (data.centroid)
      {
        obj.centroid = new Point(data.centroid[0], data.centroid[1], data.centroid[2]);
      }
      if (data.normal)
      {
        obj.normal = new Point(data.normal[0], data.normal[1], data.normal[2]);
      }

      return obj;
    }

  	function iterate(task, node, grp)
  	{
  	  var x, item, childNode;
  		for(x=0; x < node.children.length; x++)
  		{
  			childNode = node.children[x];
  			item = task(childNode);   // if child type is GROUP a new Group3D is returned
        grp.addObj(item);
  			if (childNode.children != undefined)
        {
  				iterate(task, childNode, item);     // item will be a Group3D
        }
   		}
  	}

    data = jsonData.ComponentData;    // componentdata is always an object
    if (data.children != undefined)       // test for Group3D
    {
      output = this.createGroup3D();
      iterate(makeObj, data, output);
    }
    else
    {
      output = makeObj(data); // returns SHAPE, PATH or TEXT data
    }

    return output;
  };

  /*=========================================================
   * Obj3DtoJSON
   * Convert the Obj3D data to a JSON string format.
   * The JSON string encoding can be saved to a file for
   * re-use without the neccessity of maintaining and running
   * the object creation code.
   * 'name' and 'id' are optional, saved with the JSON data.
   * The JSON string version must still be compiled back to
   * an Obj3D for drawing but this is a simple process
   * use: obj = this.JSONtoObj3D(jsonData)
   *---------------------------------------------------------
   */
  Cango3D.prototype.Obj3DtoJSON = function(obj, nameStr)
  {
    var output = {};

    function rnd(val)
    {
      return Math.round(val*1000)/1000;
    }

    function drawCmdToCgo3D(drawCmd, ary)
    {
      // push the cmd string and coords into the array
      switch (drawCmd.drawFn)
      {
        case "moveTo":
          ary.push("M");
          ary.push(rnd(drawCmd.ep.x), rnd(drawCmd.ep.y), rnd(drawCmd.ep.z));
        break;
        case "lineTo":
          ary.push("L");
          ary.push(rnd(drawCmd.ep.x), rnd(drawCmd.ep.y), rnd(drawCmd.ep.z));
        break;
        case "bezierCurveTo":
          ary.push("C");
          ary.push(rnd(drawCmd.cPts[0].x), rnd(drawCmd.cPts[0].y), rnd(drawCmd.cPts[0].z));
          ary.push(rnd(drawCmd.cPts[1].x), rnd(drawCmd.cPts[1].y), rnd(drawCmd.cPts[1].z));
          ary.push(rnd(drawCmd.ep.x), rnd(drawCmd.ep.y), rnd(drawCmd.ep.z));
        break;
        case "quadraticCurveTo":
          ary.push("Q");
          ary.push(rnd(drawCmd.cPts[0].x), rnd(drawCmd.cPts[0].y), rnd(drawCmd.cPts[0].z));
          ary.push(rnd(drawCmd.ep.x), rnd(drawCmd.ep.y), rnd(drawCmd.ep.z));
        break;
        case "closePath":
          ary.push("Z");
        break;
      }
    }

    function formatObj3DData(obj)
    {
      var data = {},
          j;

      if (obj.children != undefined)     // test for Group3D
      {
        data.type = "GROUP";
        data.children = [];
        return data;
      }

      data.type = obj.type;                       // PATH, SHAPE, TEXT
      data.fillColor = obj.fillColor.toRGBA();    // save as 'rgba(r, g, b, a)'
      data.strokeColor = obj.strokeColor.toRGBA();
      data.backColor = obj.backColor.toRGBA();
      data.strokeWidth = obj.strokeWidth;
      data.lineCap = obj.strokeCap.slice(0);

      if (obj.name !== undefined)
      {
        data.name = obj.name.slice(0);   // make a string not a reference
      }
      data.pathData = [];
      for (j=0; j<obj.drawCmds.length; j++)
      {
        drawCmdToCgo3D(obj.drawCmds[j], data.pathData);
      }
      if ((obj.type == "SHAPE")&&(obj.textCmds.length>0)) // Shape may have a label
      {
        data.textData = [];
        for (j=0; j<obj.textCmds.length; j++)
        {
          drawCmdToCgo3D(obj.textCmds[j], data.textData);
        }
      }
      if (obj.type == "TEXT") // save the Text bounding box for dragNdrop
      {
        data.textBoxData = [];
        for (j=0; j<obj.bBoxCmds.length; j++)
        {
          drawCmdToCgo3D(obj.bBoxCmds[j], data.textBoxData);
        }
      }
      // save centroid and normal (in case they've been flipped)
      data.centroid = [];
      data.centroid.push(rnd(obj.centroid.x), rnd(obj.centroid.y), rnd(obj.centroid.z));
      data.normal = [];
      data.normal.push(rnd(obj.normal.x), rnd(obj.normal.y), rnd(obj.normal.z));

      return data;
    }

    //task:function, node:object with children
  	function iterate(task, node, outAry)
  	{
  	  var x, item, childNode;
  		for(x=0; x<node.children.length; x++)
  		{
  			childNode = node.children[x];
  			item = task(childNode);   // if child is a Group3D a new array for its kids is returned
        outAry.push(item);
  			if (childNode.children != undefined)
        {
  				iterate(task, childNode, item.children);     // item will be an array
        }
   		}
  	}

    output.type = "Component";
    output.name = nameStr || "Object1";
    output.ComponentData = {};

    if (obj.children != undefined)     // test for Group3D
    {
      output.ComponentData.type = "GROUP";
      output.ComponentData.children = [];
      iterate(formatObj3DData, obj, output.ComponentData.children);
    }
    else
    {
      output.ComponentData = formatObj3DData(obj); // returns SHAPE, PATH or TEXT data
    }

    return JSON.stringify(output);
  };

  Cango3D.prototype.renderFrame = function(obj)
  {
    var savThis = this;

    function drawObj()
    {
      savThis.render(obj);  // canvas will be clear each frame
    }

    window.requestAnimationFrame(drawObj);
  };

  /*=============================================
   * render will clear the canvas and draw
   * this Group3D or Obj3D, make sure it is only
   * called on the root object of the scene.
   * If an Obj3D is passed, update the netTfm
   * and render it.
   * If a Group3D is passed, recursively update
   * the netTfm of the group's family tree, put
   * all the tree's objects into one array,
   * sort according to z, then render all Obj3Ds.
   *--------------------------------------------*/
  Cango3D.prototype.render = function(rootObj)  // Obj3D or Group3D, 'wireframe', 'noclear' strings accepted
  {
    var savThis = this,
        args,
        clear = true,
        wireframe = false,
        drawableGrps = [],
        i, t,
        objAry;

    function transformDrawCmds(obj)
    {
      // apply the netTfm matrix to all the drawCmds coordinates
      var j, k;
      for(j=0; j < obj.drawCmds.length; j++)   // step through the draw segments
      {
        for (k=0; k < obj.drawCmds[j].cPts.length; k++)   // transform each 3D Point
        {
          obj.drawCmds[j].cPts[k].softTransform(obj.netTfm.matrix);
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (obj.drawCmds[j].ep != undefined)
        {
          obj.drawCmds[j].ep.softTransform(obj.netTfm.matrix);
        }
      }
      if (obj.textCmds.length>0)     // SHAPE labels
      {
        for(j=0; j < obj.textCmds.length; j++)   // step through the draw segments
        {
          for (k=0; k < obj.textCmds[j].cPts.length; k++)   // transform each 3D Point
          {
            obj.textCmds[j].cPts[k].softTransform(obj.netTfm.matrix);
          }
          // add the end point (check it exists since 'closePath' has no end point)
          if (obj.textCmds[j].ep != undefined)
          {
            obj.textCmds[j].ep.softTransform(obj.netTfm.matrix);
          }
        }
      }
      // new transform the text bounding box
      if (obj.type == "TEXT")
      {
        // now transform the text bounding box (just moveTo and lineTo, no cPts)
        for(j=0; j < obj.bBoxCmds.length; j++)   // step through the draw segments
        {
          // check for ep since 'closePath' has no end point)
          if (obj.bBoxCmds[j].ep != undefined)
          {
            obj.bBoxCmds[j].ep.softTransform(obj.netTfm.matrix);
          }
        }
      }
      obj.dwgOrg.softTransform(obj.netTfm.matrix);    // transform the drawing origin
      obj.centroid.softTransform(obj.netTfm.matrix);  // transform the centroid
      obj.normal.softTransform(obj.netTfm.matrix);    // transform the normal
    }

    function updateTransforms(rootGrp)
    {
      function applyXfm(obj, grp)
      {
        var j;

        if (obj.children !== undefined)    // must be a Group3D
        {
          obj.grpTfm = grp.netTfm;  // grpTfm is always netTfm of the parent Group
          // now re-calc the group's netTfm which will be passed on to its kids
          for (j=0; j<obj.ofsTfmAry.length; j++)
          {
            obj.ofsTfm.applyTransform(obj.ofsTfmAry[j]);    // ofsTfmAry is array of 4x4 matrices
          }
          // obj.ofsTfm now is updated, reset the ofsTfmAry array
          obj.ofsTfmAry.length = 0;
          obj.netTfm.matrixMult(obj.ofsTfm.matrix, obj.grpTfm.matrix);
          // apply the netTfm to the grp centroid
          obj.centroid.softTransform(obj.netTfm.matrix);
          // apply this to the group drawing origin for drag and drop
          obj.dwgOrg = new Point();
          obj.dwgOrg.hardTransform(obj.netTfm.matrix);
        }
        else
        {
          obj.grpTfm = grp.netTfm;
          // now calc the netTfm
          for (j=0; j<obj.ofsTfmAry.length; j++)
          {
            obj.ofsTfm.applyTransform(obj.ofsTfmAry[j]);
          }
          // obj.ofsTfm now is updated, reset the ofsTfmAry array
          obj.ofsTfmAry.length = 0;
          // now re-calc the netTfm
          obj.netTfm.matrixMult(obj.ofsTfm.matrix, obj.grpTfm.matrix);

          // calc the transformed dwgOrg coords, dwgOrg only moved by softTfm and group soft
          obj.dwgOrg = new Point();
          obj.dwgOrg.hardTransform(obj.netTfm.matrix);

          transformDrawCmds(obj);
        }
      }
      // task:function, grp: group with children
    	function iterate(task, grp)
    	{
    	  var x, childNode;
    		for (x=0; x<grp.children.length; x++)
    		{
    			childNode = grp.children[x];
     			task(childNode, grp);
    			if (childNode.children != undefined)
          {
    				iterate(task, childNode);
          }
    		}
    	}
      // now propagate the current grpTfm through the tree of children
      iterate(applyXfm, rootGrp);
    }

    function obj3Dto2D(obj)
    {
      var j, k;

      function project3D(point)
      {
        // projection is onto screen at z = 0,
        var s = savThis.viewpointDistance/(savThis.viewpointDistance-point.tz);
        // perspective projection
        point.fx = point.tx * s;
        point.fy = point.ty * s;
      }

      // make the 2D parameters for each DrawCmd3D in drawCmds array
      for(j=0; j<obj.drawCmds.length; j++)   // step through the path segments
      {
        for (k=0; k<obj.drawCmds[j].cPts.length; k++)   // extract flattened 2D coords from 3D Points
        {
          project3D(obj.drawCmds[j].cPts[k]);             // apply perspective to nodes
          obj.drawCmds[j].parms[2*k] = obj.drawCmds[j].cPts[k].fx;
          obj.drawCmds[j].parms[2*k+1] = obj.drawCmds[j].cPts[k].fy;
        }
        // add the end point (check it exists since 'closePath' has no end point)
        if (obj.drawCmds[j].ep != undefined)
        {
          project3D(obj.drawCmds[j].ep);                    // apply perspective to end point
          obj.drawCmds[j].parms[2*k] = obj.drawCmds[j].ep.fx;
          obj.drawCmds[j].parms[2*k+1] = obj.drawCmds[j].ep.fy;
        }
      }
      if (obj.textCmds.length>0)  // SHAPE labels
      {
        // make the 2D parameters for each DrawCmd3D in textCmd array
        for(j=0; j<obj.textCmds.length; j++)   // step through the draw segments
        {
          for (k=0; k<obj.textCmds[j].cPts.length; k++)   // extract flattened 2D coords from 3D Points
          {
            project3D(obj.textCmds[j].cPts[k]);             // apply perspective to nodes
            obj.textCmds[j].parms[2*k] = obj.textCmds[j].cPts[k].fx;
            obj.textCmds[j].parms[2*k+1] = obj.textCmds[j].cPts[k].fy;
          }
          // add the end point (check it exists since 'closePath' has no end point)
          if (obj.textCmds[j].ep != undefined)
          {
            project3D(obj.textCmds[j].ep);                  // apply perspective to end point
            obj.textCmds[j].parms[2*k] = obj.textCmds[j].ep.fx;
            obj.textCmds[j].parms[2*k+1] = obj.textCmds[j].ep.fy;
          }
        }
      }
      // new the text bounding box
      if (obj.type == "TEXT")
      {
        // now project the text bounding box path
        for(j=0; j<4; j++)   // step through the draw segments (ignore final 'closePath')
        {
          project3D(obj.bBoxCmds[j].ep);                  // apply perspective to end point
          obj.bBoxCmds[j].parms[0] = obj.bBoxCmds[j].ep.fx;
          obj.bBoxCmds[j].parms[1] = obj.bBoxCmds[j].ep.fy;
        }
      }
      project3D(obj.centroid);  // project in case they are going to be drawn for debugging
      project3D(obj.normal);
      // the object's drawCmds parms arrays now hold world coord 2D projection ready to be drawn
    }

  	function getDrawableGrps(grp)
  	{
      var j, childNode;

  	  if (grp.drawObjs.length > 0)    // test if a drawable group
      {
        drawableGrps.push(grp);       // just push the grp into the array to be sorted and drawn
      }
      // step through the children looking for groups
  		for(j=0; j < grp.children.length; j++)
  		{
  			childNode = grp.children[j];
  			if ((childNode.children != undefined) && (childNode.children.length > 0))  // skip Obj3D
        {
  				getDrawableGrps(childNode);  // check if next group has drawables
        }
  		}
  	}

    function paintersSort(p1, p2)
    {
      return p1.centroid.tz - p2.centroid.tz;
    }

// ============ Start Here =====================================================

    // check arguments for 'wireframe' or 'noclear'
    args = Array.prototype.slice.call(arguments); // grab array of arguments
    for(i=0; i<arguments.length; i++)
    {
      if ((typeof args[i] == 'string')&&(args[i].toLowerCase() == 'wireframe'))
      {
        wireframe = true;
      }
      if ((typeof args[i] == 'string')&&(args[i].toLowerCase() == 'noclear'))
      {
        clear = false;
      }
    }
    if (clear === true)
    {
      this.clearCanvas();
    }
    if (rootObj.children != undefined)  // test for a Group3D (they have children)
    {
      // calculate rootObj current ofsTfm to propagate to the kids
      for (i=0; i < rootObj.ofsTfmAry.length; i++)
      {
        rootObj.ofsTfm.applyTransform(rootObj.ofsTfmAry[i]);    // ofsTfmAry is array of 4x4 matrices
      }
      // rootObj..ofsTfm now is updated, reset the ofsTfmAry array
      rootObj.ofsTfmAry.length = 0;
      // calculate obj current net transform to propagate to the kids
      rootObj.netTfm.matrixMult(rootObj.ofsTfm.matrix, rootObj.grpTfm.matrix);
      // apply this to the rootObj drawing origin for drag and drop
      rootObj.dwgOrg = new Point();
      rootObj.dwgOrg.hardTransform(rootObj.netTfm.matrix);    // transform the drawing origin (0,0,0)

      updateTransforms(rootObj);   // recursivley re-calculate the object transforms and apply them
      getDrawableGrps(rootObj);    // flatten the group tree into an array of groups to be drawn
      // Depth sort the groups (painters algorithm, draw from the back to front)
      drawableGrps.sort(paintersSort);
      // project 3D to 2D for all the Obj3Ds and draw the 2D results
      for (i=0; i<drawableGrps.length; i++)
      {
        objAry = drawableGrps[i].drawObjs;
        for (t=0; t<objAry.length; t++)
        {
          obj3Dto2D(objAry[t]);
        }
        // Depth sorting (painters algorithm, draw from the back to front)
        objAry.sort(paintersSort);
        // now render them onto the canvas
        for (t=0; t<objAry.length; t++)
        {
          this._paintObj3D(objAry[t], wireframe);
        }
      }
    }
    else  // no sorting for painters algorithm needed
    {
      // calc the net matrix from Obj2D hardOfsTfm and ofsTfmAry
      for (i=0; i < rootObj.ofsTfmAry.length; i++)
      {
        rootObj.ofsTfm.applyTransform(rootObj.ofsTfmAry[i]);    // ofsTfmAry is array of 3x3 matrices
      }
      // rootObj.ofsTfm now is updated, reset the ofsTfmAry array
      rootObj.ofsTfmAry.length = 0;
      rootObj.netTfm = rootObj.ofsTfm;     // there is no parent group so grpTfm = identity
      rootObj.dwgOrg = new Point();
      rootObj.dwgOrg.hardTransform(rootObj.netTfm.matrix);
      // apply netTfm to drawCmds
      transformDrawCmds(rootObj);
      obj3Dto2D(rootObj);
      this._paintObj3D(rootObj, wireframe);
    }
  };

/*========================================================
 * _paintObj3D takes an Obj3D which has been transformed
 * and projected to 2D all the canvas commands are
 * formatted but in world coordinates.
 * Convert to canvas pixels and draw them onto the canvas
 *-------------------------------------------------------*/
  Cango3D.prototype._paintObj3D = function(pg, wireframe)
  {
    var j, k,
        ox, oy, nx, ny,
        normX, normY, normZ,
        losX, losY, losZ;

    this.ctx.save();   // save the current ctx we are going to change bits
    this.ctx.beginPath();
    // step through the Obj3D drawCmds array and draw each one
    for (j=0; j < pg.drawCmds.length; j++)
    {
      // convert all parms to pixel coords
      for (k=0; k<pg.drawCmds[j].parms.length; k+=2)   // step thru the coords in x,y pairs
      {
        pg.drawCmds[j].parmsPx[k] = this.vpLLx+this.xoffset+pg.drawCmds[j].parms[k]*this.xscl;
        pg.drawCmds[j].parmsPx[k+1] = this.vpLLy+this.yoffset+pg.drawCmds[j].parms[k+1]*this.yscl;
      }
      // now actually draw the path onto the canvas
      this.ctx[pg.drawCmds[j].drawFn].apply(this.ctx, pg.drawCmds[j].parmsPx);
    }

    if (pg.type == "TEXT")
    {
      // construct the bounding box pixel coords for drag and drop
      for (j=0; j < pg.bBoxCmds.length; j++)
      {
        // convert all parms to pixel coords
        for (k=0; k<pg.bBoxCmds[j].parms.length; k+=2)   // step thru the coords in x,y pairs
        {
          pg.bBoxCmds[j].parmsPx[k] = this.vpLLx+this.xoffset+pg.bBoxCmds[j].parms[k]*this.xscl;
          pg.bBoxCmds[j].parmsPx[k+1] = this.vpLLy+this.yoffset+pg.bBoxCmds[j].parms[k+1]*this.yscl;
        }
      }
    }
    // fill and stroke the path
    if (pg.type == "SHAPE")
    {
      this.ctx.closePath();
      this.ctx.lineWidth = 1;
      if (!wireframe)
      {
        this.ctx.fillStyle = this._calcShapeShade(pg);
        this.ctx.strokeStyle = this.ctx.fillStyle;
        this.ctx.fill();
        if (pg.fillColor.a > 0.9)    // only stroke if solid color (don't stroke see-through panels)
        {
          this.ctx.stroke();    // stroke outline
        }
      }
      else  // wireframe - just stroke outline
      {
        this.ctx.strokeStyle = pg.strokeColor.toRGBA();
        this.ctx.lineCap = this.lineCap;
        this.ctx.stroke();    // stroke outline
      }
    }
    else  // PATH or TEXT
    {
      this.ctx.strokeStyle = pg.strokeColor.toRGBA();
      this.ctx.lineWidth = pg.strokeWidth;
      this.ctx.lineCap = pg.strokeCap;
      this.ctx.stroke();    // stroke outline
    }

    if (this.plotNormals)      // draw the normal
    {     // convert the centroid and normal too
      ox = this.vpLLx+this.xoffset+pg.centroid.fx*this.xscl;
      oy = this.vpLLy+this.yoffset+pg.centroid.fy*this.yscl;
      nx = this.vpLLx+this.xoffset+pg.normal.fx*this.xscl;
      ny = this.vpLLy+this.yoffset+pg.normal.fy*this.yscl;

      if (pg.centroid.tz < pg.normal.tz)    // +ve out of screen
      {
        this.ctx.strokeStyle = "green";   // pointing toward viewer
      }
      else
      {
        this.ctx.strokeStyle = "red";     // pointing away from viewer
      }

      this.ctx.beginPath();
      this.ctx.moveTo(ox, oy);
      this.ctx.lineTo(nx, ny);
      this.ctx.stroke();
    }
    // now draw the text character paths if text is toward the viewer
    if ((pg.type == "SHAPE")&&(pg.textCmds.length>0))
    {
      // calc normal vector from centroid
      normX = pg.normal.tx-pg.centroid.tx;
      normY = pg.normal.ty-pg.centroid.ty;
      normZ = pg.normal.tz-pg.centroid.tz;
      // unit vector from centroid to viewpoint
      losX = -pg.centroid.tx;
      losY = -pg.centroid.ty;
      losZ = this.viewpointDistance - pg.centroid.tz;
      /* Calculate if we are looking at front or back
         if normal dot product with LOS is +ve its the front, -ve its the back
         no need to normalise, just need the sign of dot product */
      if (normX*losX + normY*losY + normZ*losZ < 0) // looking at back
      {
        return;
      }
      this.ctx.beginPath();
      // step through the Obj3D textCmds array and draw each one
      for (j=0; j < pg.textCmds.length; j++)
      {
        // convert all parms to world coords
        for (k=0; k<pg.textCmds[j].parms.length; k+=2)   // step thru the coords in x,y pairs
        {
          pg.textCmds[j].parms[k] = this.vpLLx+this.xoffset+pg.textCmds[j].parms[k]*this.xscl;
          pg.textCmds[j].parms[k+1] = this.vpLLy+this.yoffset+pg.textCmds[j].parms[k+1]*this.yscl;
        }
        // now actually draw the path onto the canvas
        this.ctx[pg.textCmds[j].drawFn].apply(this.ctx, pg.textCmds[j].parms);
      }
      // stroke the path
      this.ctx.lineWidth = pg.strokeWidth;
      this.ctx.lineCap = "round";
      this.ctx.strokeStyle = pg.strokeColor.toRGBA();
      this.ctx.stroke();    // stroke outline
    }
    this.ctx.restore();  // put things back the way they were

    if (pg.dragNdrop != null)
    {
      // now push it into Cango.draggable array, its checked by canvas mousedown event handler
      if (!_draggable[this.cId].contains(pg))
      {
        _draggable[this.cId].push(pg);
      }
    }
    else if ((pg.parent)&&(pg.parent.dragNdrop != null))
    {
      // check if parent group is draggable
      if (!_draggable[this.cId].contains(pg))
      {
        _draggable[this.cId].push(pg);
      }
    }
  };

  Cango3D.prototype._calcShapeShade = function(obj)
  {
    var col, lum,
        sunX, sunY, sunZ, sunMag,
        normX, normY, normZ, normMag,
        losX, losY, losZ,
        cr, cg, cb, ca;

    // work in world coords
    // calculate unit vector in direction of the sun
    sunX = this.lightSource.x;
    sunY = this.lightSource.y;
    sunZ = this.lightSource.z;
    sunMag = Math.sqrt(sunX*sunX + sunY*sunY + sunZ*sunZ);
    sunX /= sunMag;
    sunY /= sunMag;
    sunZ /= sunMag;
    // calc unit vector normal to the panel front
    normX = obj.normal.tx-obj.centroid.tx;
    normY = obj.normal.ty-obj.centroid.ty;
    normZ = obj.normal.tz-obj.centroid.tz;
    normMag = Math.sqrt(normX*normX + normY*normY + normZ*normZ);
    normX /= normMag;
    normY /= normMag;
    normZ /= normMag;
    // luminence is dot product of panel's normal and sun vector
    lum = 0.6*(sunX*normX + sunY*normY + sunZ*normZ); // normalise to range 0..0.7
    lum = Math.abs(lum);   // normal can be up or down (back given same shading)
    lum += 0.4;            // shift range to 0.4..1 (so base level so its not too dark)
    // unit vector from centroid to viewpoint
    losX = -obj.centroid.tx;
    losY = -obj.centroid.ty;
    losZ = this.viewpointDistance - obj.centroid.tz;
    /* Now calculate if we are looking at front or back
       if normal dot product with LOS is +ve its the top, -ve its the bottom
       bottom might get a different colour.
       no need to normalise, just need the sign of dot product */
    if (normX*losX + normY*losY + normZ*losZ < 0)
    {
      //  looking at back
      col = obj.backColor;
      // back will be dark if normal (front) is pointing toward the lightSource
      if (normX*sunX + normY*sunY + normZ*sunZ > 0)
      {
        lum = 0.4;
      }
    }
    else
    {
      // looking at the front
      col = obj.fillColor;
      // front will be dark if normal is pointing away from lightSource
      if (normX*sunX + normY*sunY + normZ*sunZ < 0)
      {
         lum = 0.4;
      }
    }
    // calc rgb color based on V5 (component of normal to polygon in direction on POV)
    cr = Math.round(lum*col.r);
    cg = Math.round(lum*col.g);
    cb = Math.round(lum*col.b);
    ca = col.a;

    return "rgba("+cr+","+cg+","+cb+","+ca+")";     // string format 'rgba(r,g,b,a)'
  };

  /* =========================================================
   * Generate the Normal to a plane, given 3 points (3D)
   * which define a plane.
   * The vector returned starts at 0,0,0
   * is 1 unit long in direction perpendicular to the plane.
   * Calculates A X B where p2-p1=A, p3-p1=B
   * --------------------------------------------------------*/
  Cango3D.prototype.calcNormal = function(p1, p2, p3)
  {
    var n = new Point(0, 0, 1);  // default if vectors degenerate
    var a = new Point(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z);   // vector from p1 to p2
    var b = new Point(p3.x-p1.x, p3.y-p1.y, p3.z-p1.z);   // vector from p1 to p3
    // a and b lie in the plane, a x b (cross product) is normal to both ie normal to plane
    // left handed coord system use left hand to get X product direction
    var nx = a.y*b.z - a.z*b.y;
    var ny = a.z*b.x - a.x*b.z;
    var nz = a.x*b.y - a.y*b.x;
    var mag = Math.sqrt(nx*nx + ny*ny + nz*nz);   // calc vector length
    if (mag)
    {
      n = new Point(nx/mag, ny/mag, nz/mag);      // make 'unit' vector
    }

    return n;
  };

  /* =========================================================
   * Calculate the included angle between 2 vectors
   * a, from base p1 to p2, and b, from p1 to p3.
   * --------------------------------------------------------*/
  Cango3D.prototype.calcIncAngle = function(p1, p2, p3)
  {
    var angRads = 0;
    var a = new Point(p2.x-p1.x, p2.y-p1.y, p2.z-p1.z);   // vector from p1 to p2
    var b = new Point(p3.x-p1.x, p3.y-p1.y, p3.z-p1.z);   // vector from p1 to p3

    var numerator = a.x*b.x + a.y*b.y + a.z*b.z;
    var denominator	= Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z)*Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z);
    if (denominator)
    {
      angRads = Math.acos(numerator/denominator);
    }

    return angRads*180.0/Math.PI;
  };

  /* =======================================================================
   * objectOfRevolution3D
   * The profile described by 'path' array of Cgo3D commands will form
   * the profile of an object of revolution. 'path' coordinates will be in
   * world cordinates. An Obj3D of type PATH is made of this profile and rotated
   * by the segment angle about the Y axis, the segment end points are joined
   * to the original profile by circular arcs top and bottom defining a curved
   * panel. These panels form one segment of the shape like a segment of an
   * orange. To get color filling to work, path sections must traversed in a
   * consistant direction, CCW to get the normal pointing out of screen.
   * So one side of the panel must be tranversd backwards. This is OK, as only
   * Bezier curves and straight lines are used in Cgo3D format data.
   * Parameters:
   * path: Array of Cgo3D format commands defining the profile in the X,Y plane
   * xOfs: an offset added to profile x coordinates (correct for SVG origin offset)
   * segments: number of segments into which totalAngle is divided
   * fillColor: HTML format color string
   * bkColor: HTML format color string
   * straight: If true, straight lines used to join segments
   * returns a Group3D.
   * -----------------------------------------------------------------------*/
  Cango3D.prototype.objectOfRevolution3D = function(path, xOfs, segments, fillColor, bkCol, straight)
  {
    /*=========================================================
     * function genSvgArc()
     * Generate the SVG format array for a circular arc with
     * center as start piont (canvas style) convert to SVG style
     * The actual arc will compile to Bezier curves by Cango
     * (these can be rotated in 3D and hold their shape).
     * Assumes Cango coords, y +ve up, angles +ve CCW.
     * The arc center is at cx, cy. Arc starts from startAngle
     * and ends at endAngle. startAngle and endAngle are in
     * degrees. The arc radius is r (in world coords). If
     * antiClockwise is true the arc is traversed ccw, if false
     * it is traversed cw.
     *---------------------------------------------------------*/
    var savThis = this,
        pathObj = this.compilePath3D(path),
        grp = this.createGroup3D(),
        startX = 0,
        startY = 0,
        endX = 0,
        endY = 0,
        panel, panelCmds, pp1Cmds, panelObj,
        topRim, botRim,
        topRimObj, botRimObj, topRimCmds,
        segs = segments || 6,
        segAng = 360 / segs,           // included angle of each segment
        segRad = segAng*Math.PI/180,
        color = this.paintCol,
        bkColor = color,
        i, r,
        st, sp,
        topObj, botObj, topData, botData,
        profile_0, profile_1,
        n, m;

    /* create a copy (not just a reference) of an object */
    function clone(obj)
    {
      var newObj = (obj instanceof Array) ? [] : {},
          j;

      for (j in obj)
      {
        if (obj[j] && typeof obj[j] == "object")
        {
          newObj[j] = clone(obj[j]);
        }
        else
        {
          newObj[j] = obj[j];
        }
      }
      return newObj;
    }

    function genSvgArc(cx, cy, r, startAngle, endAngle, antiClockwise)
    {
      var stRad = startAngle * Math.PI/180,
          edRad = endAngle * Math.PI/180,
          mj = 0.55228475,                 // magic number for drawing circle with 4 Bezier curve
          oy = cy + r*Math.sin(stRad),   // coords of start point for circlular arc with center (cx,cy)
          ox = cx + r*Math.cos(stRad),
          ey = cy + r*Math.sin(edRad),   // coords of end point for circlular arc with center (cx,cy)
          ex = cx + r*Math.cos(edRad),
          ccw = (antiClockwise? 1 : 0),
          delta,
          lrgArc,
          swp,
          svgData;

      swp = 1 - ccw;          // 0=ccw 1=cw   (flipped for this ccw +ve world)
      delta = ccw? edRad - stRad :stRad - edRad;
      if (delta < 0)
      {
        delta += 2*Math.PI;
      }
      if (delta > 2* Math.PI)
      {
        delta -= 2*Math.PI;
      }
      lrgArc = delta > Math.PI? 1: 0;

      // dont try to draw full circle or no circle
      if ((Math.abs(delta) < 0.01) || (Math.abs(delta) > 2*Math.PI-0.01))
      {
        svgData = ["M",cx, cy-r,"C",cx+mj*r, cy-r, cx+r, cy-mj*r, cx+r, cy,
                                    cx+r, cy+mj*r, cx+mj*r, cy+r, cx, cy+r,
                                    cx-mj*r, cy+r, cx-r, cy+mj*r, cx-r, cy,
                                    cx-r, cy-mj*r, cx-mj*r, cy-r, cx, cy-r];
      }
      else
      {
        svgData = ["M", ox, oy, "A", r, r, 0, lrgArc, swp, ex, ey];
      }

      return savThis.svgToCgo3D(svgData);
    }


    if (fillColor !== undefined)
    {
      color = fillColor;
    }
    if (bkCol !== undefined)
    {
      bkColor = bkCol;
    }
    st = 1;         // which segment to start building from
    sp = pathObj.drawCmds.length;
    // Check if top can be made in a single piece
    if (((pathObj.drawCmds[0].ep.x+xOfs)*this.xscl < 3)&&(pathObj.drawCmds[0].ep.y == pathObj.drawCmds[1].ep.y))
    {
      // make the top
      r = pathObj.drawCmds[1].ep.x;
      if (straight)
      {
        topData = ['M',r,0,0];
        for (i=1; i<segments; i++)
        {
          topData.push('L',r*Math.cos(i*segRad),r*Math.sin(i*segRad),0);
        }
        topData.push('Z');
        topObj = this.compileShape3D(topData, color, bkColor);
      }
      else
      {
        topObj = this.compileShape3D(shapes3D.circle, color, bkColor, 2*r);
      }
      // flip over to xz plane
      topObj.rotate(1, 0, 0, -90);
      // lift up to startY
      topObj.translate(0,pathObj.drawCmds[0].ep.y,0);
      grp.addObj(topObj);
      st = 2;  // skip the first section of the profile its done
    }
    // Check if bottom can be made in a single piece
    if (((pathObj.drawCmds[sp-1].ep.x+xOfs)*this.xscl < 3)&&(pathObj.drawCmds[sp-1].ep.y == pathObj.drawCmds[sp-2].ep.y))
    {
      // make the bottom
      r = pathObj.drawCmds[sp-2].ep.x;
      if (straight)
      {
        botData = ['M',r,0,0];
        for (i=1; i<segments; i++)
        {
          botData.push('L',r*Math.cos(i*segRad),r*Math.sin(i*segRad),0);
        }
        botData.push('Z');
        botObj = this.compileShape3D(botData, color, bkColor);
      }
      else
      {
        botObj = this.compileShape3D(shapes3D.circle, color, bkColor, 2*r);
      }
      // flip over to xz plane
      botObj.rotate(1, 0, 0, 90);
      // lift up to end Y
      botObj.translate(0,pathObj.drawCmds[sp-1].ep.y,0);
      grp.addObj(botObj);
      sp -= 1;  // skip the last section of the profile its done
    }
    profile_0 = pathObj.dup(); // make a copy
    profile_1 = pathObj.dup(); // two needed (not new reference)
    // move the profile by xOfs, useful for SVG copied profiles
    profile_0.translate(xOfs, 0, 0);
    profile_1.translate(xOfs, 0, 0);
    // now this profile must be rotated by the segment angle to form the other side
    profile_1.rotate(0, 1, 0, segAng);   // rotate segment by segAng out of screen
    for (n=0; n<segs; n++)
    {
      for (m=st; m<sp; m++)
      {
        // construct a panel from top and bottom arcs and 2 copies of profile segment
        if (profile_0.drawCmds[m-1].ep.x*this.xscl < 3)   // truncate to 1st Quadrant
        {
          profile_0.drawCmds[m-1].ep.x = 0;
          profile_1.drawCmds[m-1].ep.x = 0;
        }
        startX = profile_0.drawCmds[m-1].ep.x;
        startY = profile_0.drawCmds[m-1].ep.y;
        endX = profile_0.drawCmds[m].ep.x;
        endY = profile_0.drawCmds[m].ep.y;
        if (startX*this.xscl >= 3) // make a topRim if profile doesn't start at center
        {
          // top rim (drawn in xy), endpoint will be where this profile slice starts
          if (straight)
          {
            topRim = ['M',startX*Math.cos(segRad),startX*Math.sin(segRad),0, 'L',startX,0,0];
          }
          else
          {
            topRim = genSvgArc(0, 0, startX, segAng, 0, 0);  // generate SVG cmds for top arc
          }
          // shove them into an object to enable rotate and translate
          topRimObj = this.compilePath3D(topRim, color);
          // topRim is in xy plane must be rotated to be in xz plane to join profile
          topRimObj.rotate(1, 0, 0, -90);      // flip top out of screen
          topRimObj.translate(0, startY, 0);   // move up from y=0 to top of profile slice
          // use topRim drawCmds to start the panel array of DrawCmd3Ds
          panel = topRimObj.drawCmds;
        }
        else
        {
          // construct a moveTo command from end point of last command
          topRimCmds = new DrawCmd3D("moveTo", [], clone(profile_0.drawCmds[m-1].ep));
          panel = [topRimCmds];     // use this to start the panel DrawCmd3Ds array
        }
        // copy the profile_0's DrawCmd3D for this segment, push it into panel drawCmds
        panelCmds = clone(profile_0.drawCmds[m]);
        panel.push(panelCmds);
        if (endX > 3)  // make the bottom rim if it has any size
        {
          if (straight)
          {
            botRim = ['M',endX,0,0, 'L',endX*Math.cos(-segRad),endX*Math.sin(-segRad),0];
          }
          else
          {
            botRim = genSvgArc(0, 0, endX, 0, -segAng, 0);
          }
          // shove them into an object to enable rotate and translate
          botRimObj = this.compilePath3D(botRim, color);
          // rim is in xy plane rotate to be in xz plane
          botRimObj.rotate(1, 0, 0, 90);       // flip bottom up to be out of screen
          botRimObj.translate(0, endY, 0);   // move down from y=0 to bottom of profile
          // now this is an moveTo and a bezierCurveTo, drop the 'moveTo'
          panel.push(botRimObj.drawCmds[1]);  // only 1 Bezier here
        }
        // construct a DrawCmd3D going backward up profile_1
        pp1Cmds = new DrawCmd3D(profile_1.drawCmds[m].drawFn.slice(0), [], clone(profile_1.drawCmds[m-1].ep));
        // change order of cPts if its a Bezier
        if (profile_1.drawCmds[m].cPts.length)
        {
          pp1Cmds.cPts.push(clone(profile_1.drawCmds[m].cPts[1]));
          pp1Cmds.cPts.push(clone(profile_1.drawCmds[m].cPts[0]));
        }
        panel.push(pp1Cmds);  // now add retrace path to the panel commands
        // make an Obj3D for this panel
        panelObj = new Obj3D(this, panel, "SHAPE", color, bkColor);
        // now add the complete panel to the array which makes the final shape
        grp.addObj(panelObj);
      }
      // rotate the previously made panels out of the way of next segment
      grp.rotate(0, 1, 0, segAng);
    }

    return grp;
  };

  /* ========================================================================
   * Convert Cgo3D data array ['M',x,y,z, 'L',x,y,z, ... 'Q',cx,cy,cz,x,y,z ]
   * to DrawCmd3Ds {drawFn:'moveTo', cPts:[], ep:{x,y,z..}}
   * -----------------------------------------------------------------------*/
  Cango3D.prototype._cgo3DtoDrawCmd3D = function(segs, xRef, yRef, zRef, scl)
  {
    var x = 0;
    var y = 0;
    var z = 0;
    var cPts;        // array of control points
    var ep;          // end point
    var px,py,pz;
    var c1x,c1y,c1z;
    var seg, cmd;
    var cmdObj;
    var commands = [];
    var xScale = scl || 1;        // only allow isotropic scaling
    var yScale = xScale;
    var zScale = xScale;
    var xOfs = xRef || 0;         // move the shape reference point
    var yOfs = yRef || 0;
    var zOfs = zRef || 0;
    var i, coords;
    for (i=0; i<segs.length; i++)
    {
      seg = segs[i];
      cmd = seg[0];
      if ((i==0)&&(cmd != 'M'))   // check that the first move is absolute
      {
        cmd = 'M';
      }
      coords = seg.slice(1);
      if (coords)
      {
        coords = coords.map(parseFloat);
      }
      switch(cmd)
      {
        case 'M':
          x = xOfs + xScale*coords[0];
          y = yOfs + yScale*coords[1];
          z = zOfs + zScale*coords[2];
          px = py = pz = null;
          cPts = [];
          ep = new Point(x, y, z);
          cmdObj = new DrawCmd3D('moveTo', cPts, ep);
          commands.push(cmdObj);
          coords.splice(0, 3);      // delete the 3 coords from the front of the array
          while (coords.length>0)
          {
            x = xOfs + xScale*coords[0];                // eqiv to muliple 'L' calls
            y = yOfs + yScale*coords[1];
            z = zOfs + zScale*coords[2];
            cPts = [];
            ep = new Point(x, y, z);
            cmdObj = new DrawCmd3D('lineTo', cPts, ep); // any coord pair after first move is regarded as line
            commands.push(cmdObj);
            coords.splice(0, 3);
          }
          break;
        case 'm':
          x += xScale*coords[0];
          y += yScale*coords[1];
          z += zScale*coords[2];
          px = py = pz = null;
          cPts = [];
          ep = new Point(x, y, z);
          cmdObj = new DrawCmd3D('moveTo', cPts, ep);
          commands.push(cmdObj);
          coords.splice(0, 3);      // delete the 3 coords from the front of the array
          while (coords.length>0)
          {
            x += xScale*coords[0];                     // eqiv to muliple 'l' calls
            y += yScale*coords[1];
            z += zScale*coords[2];
            cPts = [];
            ep = new Point(x, y, z);
            cmdObj = new DrawCmd3D('lineTo', cPts, ep); // any coord pair after first move is regarded as line
            commands.push(cmdObj);
            coords.splice(0, 3);
          }
          break;
        case 'L':
          while (coords.length>0)
          {
            x = xOfs + xScale*coords[0];
            y = yOfs + yScale*coords[1];
            z = zOfs + zScale*coords[2];
            cPts = [];
            ep = new Point(x, y, z);
            cmdObj = new DrawCmd3D('lineTo', cPts, ep);
            commands.push(cmdObj);
            coords.splice(0, 3);
          }
          px = py = null;
          break;
        case 'l':
          while (coords.length>0)
          {
            x += xScale*coords[0];
            y += yScale*coords[1];
            z += zScale*coords[2];
            cPts = [];
            ep = new Point(x, y, z);
            cmdObj = new DrawCmd3D('lineTo', cPts, ep);
            commands.push(cmdObj);
            coords.splice(0, 3);
          }
          px = py = null;
          break;
        case 'C':
          while (coords.length>0)
          {
            c1x = xOfs + xScale*coords[0];
            c1y = yOfs + yScale*coords[1];
            c1z = zOfs + zScale*coords[2];
            px = xOfs + xScale*coords[3];
            py = yOfs + yScale*coords[4];
            pz = zOfs + zScale*coords[5];
            x = xOfs + xScale*coords[6];
            y = yOfs + yScale*coords[7];
            z = zOfs + zScale*coords[8];
            cPts = [];
            cPts[0] = new Point(c1x, c1y, c1z);
            cPts[1] = new Point(px, py, pz);
            ep = new Point(x, y, z);
            cmdObj = new DrawCmd3D('bezierCurveTo', cPts, ep);
            commands.push(cmdObj);
            coords.splice(0, 9);
          }
          break;
        case 'c':
          while (coords.length>0)
          {
            c1x = x + xScale*coords[0];
            c1y = y + yScale*coords[1];
            c1z = z + zScale*coords[2];
            px = x + xScale*coords[3];
            py = y + yScale*coords[4];
            pz = z + zScale*coords[5];
            x += xScale*coords[6];
            y += yScale*coords[7];
            z += zScale*coords[8];
            cPts = [];
            cPts[0] = new Point(c1x, c1y, c1z);
            cPts[1] = new Point(px, py, pz);
            ep = new Point(x, y, 0);
            cmdObj = new DrawCmd3D('bezierCurveTo', cPts, ep);
            commands.push(cmdObj);
            coords.splice(0, 9);
          }
          break;
        case 'Q':
          px = xOfs + xScale*coords[0];
          py = yOfs + yScale*coords[1];
          pz = zOfs + zScale*coords[2];
          x = xOfs + xScale*coords[3];
          y = yOfs + yScale*coords[4];
          z = zOfs + zScale*coords[5];
          cPts = [];
          cPts[0] = new Point(px, py, pz);
          ep = new Point(x, y, z);
          cmdObj = new DrawCmd3D('quadraticCurveTo', cPts, ep);
          commands.push(cmdObj);
          break;
        case 'q':
          cPts = [];
          cPts[0] = new Point(x + xScale*coords[0], y + yScale*coords[1], z + zScale*coords[2]);
          ep = new Point(x + xScale*coords[3], y + yScale*coords[4], z + zScale*coords[5]);
          cmdObj = new DrawCmd3D('quadraticCurveTo', cPts, ep);
          commands.push(cmdObj);
          px = x + xScale*coords[0];
          py = y + yScale*coords[1];
          pz = z + zScale*coords[2];
          x += xScale*coords[3];
          y += yScale*coords[4];
          z += zScale*coords[5];
          break;
        case 'Z':
          cmdObj = new DrawCmd3D('closePath');
          commands.push(cmdObj);
          break;
        case 'z':
          cmdObj = new DrawCmd3D('closePath');
          commands.push(cmdObj);
          break;
      }
    }
    return commands;
  };
  
  /* ========================================================================
   * Convert SVG format 2D data which can be either a String or an Array
   * in format "M, x, y, L, x, y ... " or ['M', x, y, 'L', x, y ... ]
   * to Cgo3D array ['M',x,y,z, 'L',x,y,z, ... 'Q',cx,cy,cz,x,y,z ]
   * Path data from SVG editors often have the drawing origin offset a long
   * way, xRef, yRef will be added to all coords to correct this
   * NOTE: String format data is assumed to be Y +ve down and so all
   * Y coordinates are flipped in sign. This does not happen to array data.
   * -----------------------------------------------------------------------*/
  Cango3D.prototype.svgToCgo3D = function(svgPath, xRef, yRef)
  {

    function segmentToBezier(cx, cy, th0, th1, rx, ry, sin_th, cos_th)
    {
      var a00 = cos_th * rx;
      var a01 = -sin_th * ry;
      var a10 = sin_th * rx;
      var a11 = cos_th * ry;

      var th_half = 0.5 * (th1 - th0);
      var t = (8/3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half);
      var x1 = cx + Math.cos(th0) - t * Math.sin(th0);
      var y1 = cy + Math.sin(th0) + t * Math.cos(th0);
      var x3 = cx + Math.cos(th1);
      var y3 = cy + Math.sin(th1);
      var x2 = x3 + t * Math.sin(th1);
      var y2 = y3 - t * Math.cos(th1);
      return [ a00 * x1 + a01 * y1, a10 * x1 + a11 * y1,
               a00 * x2 + a01 * y2, a10 * x2 + a11 * y2,
               a00 * x3 + a01 * y3, a10 * x3 + a11 * y3 ];
    }

    function arcToBezier(ox, oy, rx, ry, rotateX, large, sweep, x, y)
    {
      var th = rotateX * (Math.PI/180);
      var sin_th = Math.sin(th);
      var cos_th = Math.cos(th);
      rx = Math.abs(rx);
      ry = Math.abs(ry);
      var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5;
      var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5;
      var pl = (px*px) / (rx*rx) + (py*py) / (ry*ry);
      if (pl > 1)
      {
        pl = Math.sqrt(pl);
        rx *= pl;
        ry *= pl;
      }

      var a00 = cos_th / rx;
      var a01 = sin_th / rx;
      var a10 = -sin_th / ry ;
      var a11 = cos_th / ry;
      var x0 = a00 * ox + a01 * oy;
      var y0 = a10 * ox + a11 * oy;
      var x1 = a00 * x + a01 * y;
      var y1 = a10 * x + a11 * y;

      var d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0);
      var sfactor_sq = 1 / d - 0.25;
      if (sfactor_sq < 0)
      {
        sfactor_sq = 0;
      }
      var sfactor = Math.sqrt(sfactor_sq);
      if (sweep == large)
      {
        sfactor = -sfactor;
      }
      var xc = 0.5 * (x0 + x1) - sfactor * (y1-y0);
      var yc = 0.5 * (y0 + y1) + sfactor * (x1-x0);

      var th0 = Math.atan2(y0-yc, x0-xc);
      var th1 = Math.atan2(y1-yc, x1-xc);

      var th_arc = th1-th0;
      if (th_arc < 0 && sweep == 1)
      {
        th_arc += 2*Math.PI;
      }
      else if (th_arc > 0 && sweep == 0)
      {
        th_arc -= 2 * Math.PI;
      }

      var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
      var result = [];
      var i, th2, th3;
      for (i=0; i<segments; i++)
      {
        th2 = th0 + i * th_arc / segments;
        th3 = th0 + (i+1) * th_arc / segments;
        result.push(segmentToBezier(xc, yc, th2, th3, rx, ry, sin_th, cos_th));
      }

      return result;
    }

    function segsToCgo3D(segs, xRef, yRef, xScl, yScl)
    {
      var x = 0;
      var y = 0;
      var z = 0;
      var c1x, c1y, px,py;
      var rx, ry, rot, larc, swp, arc_segs;
      var seg, cmd, pc;
      var commands = [];
      var xScale = xScl || 1;
      var yScale = yScl || xScale;          // in case only single scale factor passed
      var xOfs = xRef || 0;                 // move the shape reference point
      var yOfs = yRef || 0;
      var i, j, coords;
      for (i=0; i<segs.length; i++)
      {
        seg = segs[i];
        cmd = seg[0];
        if ((i==0)&&(cmd != 'M'))   // check that the first move is absolute
        {
          cmd = 'M';
        }
        coords = seg.slice(1);      // skip the command copy coords
        if (coords)
        {
          coords = coords.map(parseFloat);
        }
        switch(cmd)
        {
          case 'M':
            x = xOfs + xScale*coords[0];
            y = yOfs + yScale*coords[1];
            z = 0;
            px = py = null;
            commands.push('M', x, y, z);
            coords.splice(0, 2);      // delete the 2 coords from the front of the array
            while (coords.length>0)
            {
              x = xOfs + xScale*coords[0];                // eqiv to muliple 'L' calls
              y = yOfs + yScale*coords[1];
              z = 0;
              commands.push('L', x, y, z); // coords after first move is regarded as line
              coords.splice(0, 2);
            }
            break;
          case 'm':
            x += xScale*coords[0];
            y += yScale*coords[1];
            z = 0;
            px = py = null;
            commands.push('M', x, y, z);
            coords.splice(0, 2);      // delete the 2 coords from the front of the array
            while (coords.length>0)
            {
              x += xScale*coords[0];              // eqiv to muliple 'l' calls
              y += yScale*coords[1];
              z = 0;
              commands.push('L', x, y, z); // any coord pair after first move is regarded as line
              coords.splice(0, 2);
            }
            break;
          case 'L':
            while (coords.length>0)
            {
              x = xOfs + xScale*coords[0];
              y = yOfs + yScale*coords[1];
              z = 0;
              commands.push('L', x, y, z);
              coords.splice(0, 2);
            }
            px = py = null;
            break;
          case 'l':
            while (coords.length>0)
            {
              x += xScale*coords[0];
              y += yScale*coords[1];
              z = 0;
              commands.push('L', x, y, z);
              coords.splice(0, 2);
            }
            px = py = null;
            break;
          case 'H':
            x = xOfs + xScale*coords[0];
            px = py = null ;
            commands.push('L', x, y, z);
            break;
          case 'h':
            x += xScale*coords[0];
            px = py = null ;
            commands.push('L', x, y, z);
            break;
          case 'V':
            y = yOfs + yScale*coords[0];
            px = py = null;
            commands.push('L', x, y, z);
            break;
          case 'v':
            y += yScale*coords[0];
            px = py = null;
            commands.push('L', x, y, z);
            break;
          case 'C':
            while (coords.length>0)
            {
              c1x = xOfs + xScale*coords[0];
              c1y = yOfs + yScale*coords[1];
              px = xOfs + xScale*coords[2];
              py = yOfs + yScale*coords[3];
              x = xOfs + xScale*coords[4];
              y = yOfs + yScale*coords[5];
              z = 0;
              commands.push('C', c1x, c1y, 0, px, py, 0, x, y, z);
              coords.splice(0, 6);
            }
            break;
          case 'c':
            while (coords.length>0)
            {
              c1x = x + xScale*coords[0];
              c1y = y + yScale*coords[1];
              px = x + xScale*coords[2];
              py = y + yScale*coords[3];
              x += xScale*coords[4];
              y += yScale*coords[5];
              z = 0;
              commands.push('C', c1x, c1y, 0, px, py, 0, x, y, z);
              coords.splice(0, 6);
            }
            break;
          case 'S':
            if (px == null || !pc.match(/[sc]/i))
            {
              px = x;                // already absolute coords
              py = y;
            }
            commands.push('C', x-(px-x), y-(py-y), 0,
                              xOfs + xScale*coords[0], yOfs + yScale*coords[1], 0,
                              xOfs + xScale*coords[2], yOfs + yScale*coords[3], 0);
            px = xOfs + xScale*coords[0];
            py = yOfs + yScale*coords[1];
            x = xOfs + xScale*coords[2];
            y = yOfs + yScale*coords[3];
            break;
          case 's':
            if (px == null || !pc.match(/[sc]/i))
            {
              px = x;
              py = y;
            }
            commands.push('C', x-(px-x), y-(py-y), 0,
                              x + xOfs + xScale*coords[0], y + yOfs + yScale*coords[1], 0,
                              x + xOfs + xScale*coords[2], y + yOfs + yScale*coords[3], 0);
            px = x + xScale*coords[0];
            py = y + yScale*coords[1];
            x += xScale*coords[2];
            y += yScale*coords[3];
            break;
          case 'Q':
            px = xOfs + xScale*coords[0];
            py = yOfs + yScale*coords[1];
            x = xOfs + xScale*coords[2];
            y = yOfs + yScale*coords[3];
            z = 0;
            commands.push('Q', px, py, 0, x, y, z);
            break;
          case 'q':
            commands.push('Q', x + xScale*coords[0], y + yScale*coords[1], 0,
                              x + xScale*coords[2], y + yScale*coords[3], 0);
            px = x + xScale*coords[0];
            py = y + yScale*coords[1];
            x += xScale*coords[2];
            y += yScale*coords[3];
            break;
          case 'T':
            if (px == null || !pc.match(/[qt]/i))
            {
              px = x;
              py = y;
            }
            else
            {
              px = x-(px-x);
              py = y-(py-y);
            }
            commands.push('Q', px, py, 0, xOfs + xScale*coords[0], yOfs + yScale*coords[1], 0);
            px = x-(px-x);
            py = y-(py-y);
            x = xOfs + xScale*coords[0];
            y = yOfs + yScale*coords[1];
            break;
          case 't':
            if (px == null || !pc.match(/[qt]/i))
            {
              px = x;
              py = y;
            }
            else
            {
              px = x-(px-x);
              py = y-(py-y);
            }
            commands.push('Q', px, py, 0, x + xScale*coords[0], y + yScale*coords[1], 0);
            x += xScale*coords[0];
            y += yScale*coords[1];
            break;
          case 'A':
            while (coords.length>0)
            {
              px = x;
              py = y;
              rx = xScale*coords[0];
              ry = xScale*coords[1];
              rot = -coords[2];          // rotationX: swap for CCW +ve
              larc = coords[3];          // large arc    should be ok
              swp = 1 - coords[4];       // sweep: swap for CCW +ve
              x = xOfs + xScale*coords[5];
              y = yOfs + yScale*coords[6];
              z = 0;
              arc_segs = arcToBezier(px, py, rx, ry, rot, larc, swp, x, y);
              for (j=0; j<arc_segs.length; j++)
              {
                commands.push('C', arc_segs[j][0], arc_segs[j][1], 0,
                                   arc_segs[j][2], arc_segs[j][3], 0,
                                   arc_segs[j][4], arc_segs[j][5], 0);
              }
              coords.splice(0, 7);
            }
            break;
          case 'a':
            while (coords.length>0)
            {
              px = x;
              py = y;
              rx = xScale*coords[0];
              ry = xScale*coords[1];
              rot = -coords[2];          // rotationX: swap for CCW +ve
              larc = coords[3];          // large arc    should be ok
              swp = 1 - coords[4];       // sweep: swap for CCW +ve
              x += xScale*coords[5];
              y += yScale*coords[6];
              arc_segs = arcToBezier(px, py, rx, ry, rot, larc, swp, x, y);
              for (j=0; j<arc_segs.length; j++)
              {
                commands.push('C', arc_segs[j][0], arc_segs[j][1], 0,
                                   arc_segs[j][2], arc_segs[j][3], 0,
                                   arc_segs[j][4], arc_segs[j][5], 0);
              }
              coords.splice(0, 7);
            }
            break;
          case 'Z':
            commands.push('Z');
             break;
          case 'z':
            commands.push('Z');
            break;
        }
        pc = cmd;     // save the previous command for possible reflected control points
      }
      return commands;
    }

    var cgoData;
    var segs;
    var cmd, seg, cmdLetters, coords;
    var xScale, yScale, scale;                        // flip all the y coords to +ve up
    var xOfs, yOfs;
    var j, k;
    if (typeof svgPath == 'string')
    {
      // this is a preprocessor to get an svg Path string into 'Cango3D' format
      segs = [];
      var strs = svgPath.split(/(?=[a-df-z])/i);  // avoid e in exponents
      // now we have an array of strings with command letter start to each
      for (k=0; k<strs.length; k++)
      {
        seg = strs[k];
        // get command letter into an array
        cmdLetters = seg.match(/[a-z]/i);
        if (!cmdLetters)
        {
          return [];
        }
        cmd = cmdLetters.slice(0,1);
        if ((k==0)&&(cmd[0] != 'M'))   // check that the first move is absolute
        {
          cmd[0] = 'M';
        }
        coords = seg.match(/[\-\+]?[0-9]*\.?[0-9]+([eE][\-\+]?[0-9]+)?/gi);
        if (coords)
        {
          coords = coords.map(parseFloat);
        }
        segs.push(cmd.concat(coords));
      }
      // now send these off to the svg segs to canvas Cgo3D processor
      xScale = 1;
      yScale = -1;                        // flip all the y coords to +ve up
      xOfs = xRef || 0;                 // move the path reference point
      yOfs = yRef || 0;
      cgoData = segsToCgo3D(segs, xOfs, -yOfs, xScale, yScale);
    }
    else
    {
      if (!isArray(svgPath))
      {
        return;
      }
      segs = [];
      for(j=0, k=1; k<svgPath.length; k++)
      {
        if (typeof svgPath[k] == 'string')
        {
          segs.push(svgPath.slice(j,k));
          j = k;
        }
      }
      segs.push(svgPath.slice(j,k));    // push the last command out
      // now send these off to the svg segs-to-canvas DrawCmd processor
      scale = 1;
      xOfs = 0;                 // move the shape reference point
      yOfs = 0;

      cgoData = segsToCgo3D(segs, xOfs, yOfs, scale, scale);
    }

    return cgoData;  // array in Cgo3D format ['M', x, y, z, 'L', x, y, z, ....]
  };

  Drag3D = function(cangoGC, grabFn, dragFn, dropFn)
  {
    var savThis = this;

    this.cgo = cangoGC;
    this.target = null;   // the Obj3D or Group3D that the Drag3D is attached to (as dragNdrop property)
    this.grabCallback = grabFn || null;
    this.dragCallback = dragFn || null;
    this.dropCallback = dropFn || null;
    this.dwgOrg = {x:0, y:0, z:0};   // target's drawing origin in world coords
    this.grabOfs = {x:0, y:0, z:0};  // csr offset from target's drawing origin in world coords
    this.dwgOrgOfs = {x:0, y:0, z:0};   // target's dwgOrg offset from its parent Group3D dwgOrg
    this.grpGrabOfs = {x:0, y:0, z:0};  // cursor offset from the target's parent Group3D drawing origin

    // these closures are called in the scope of the Drag3D instance so 'this' is valid
    this.grab = function(evt, grabbedObj)
    {
      var event = evt||window.event;
      // this Drag3D may be attached to an Obj3D's Group3D parent
      if (grabbedObj.dragNdrop != null)
      {
        this.target = grabbedObj;      // the target is an Obj3D
      }
      else if ((grabbedObj.parent)&&(grabbedObj.parent.dragNdrop))
      {
        this.target = grabbedObj.parent; // the target is a Group3D, child Obj3D clicked on
      }
      else  // cant find the dragNdrop for this grab
      {
        return;
      }
      this.dwgOrg = this.target.dwgOrg;

      this.cgo.cnvs.onmouseup = function(e){savThis.drop(e);};
      var csrPosWC = this.cgo._getCursorPosWC(event);  // world coords version of cursor position
      // save the cursor offset from the local (Obj3D) drawing origin (world coords)
      this.grabOfs = {x:csrPosWC.x - this.dwgOrg.x,
                      y:csrPosWC.y - this.dwgOrg.y,
                      z:csrPosWC.z - this.dwgOrg.z};
      if (this.target.parent)
      {
        this.dwgOrgOfs = {x:this.dwgOrg.x - this.target.parent.dwgOrg.x,
                          y:this.dwgOrg.y - this.target.parent.dwgOrg.y,
                          z:this.dwgOrg.z - this.target.parent.dwgOrg.z};
      }
      else
      {
        this.dwgOrgOfs = {x:this.dwgOrg.x, y:this.dwgOrg.y, z:this.dwgOrg.z};
      }
      // save the cursor offset from the target's parent Group3D drawing origin (world coords)
      this.grpGrabOfs = {x:csrPosWC.x - this.dwgOrgOfs.x,
                         y:csrPosWC.y - this.dwgOrgOfs.y,
                         z:csrPosWC.z - this.dwgOrgOfs.z};
      if (this.grabCallback)
      {
        this.grabCallback(csrPosWC);    // call in the scope of dragNdrop object
      }

      this.cgo.cnvs.onmousemove = function(event){savThis.drag(event);};
      if (event.preventDefault)       // prevent default browser action (W3C)
      {
        event.preventDefault();
      }
      else                        // shortcut for stopping the browser action in IE
      {
        window.event.returnValue = false;
      }
      return false;
    };

    this.drag = function(event)
    {
      var csrPosWC = this.cgo._getCursorPosWC(event);
      if (this.dragCallback)
      {
        this.dragCallback(csrPosWC);
      }

      return false;
    };

    this.drop = function(event)
    {
      var csrPosWC = this.cgo._getCursorPosWC(event);
      this.cgo.cnvs.onmouseup = null;
      this.cgo.cnvs.onmousemove = null;
      if (this.dropCallback)
      {
        this.dropCallback(csrPosWC);
      }
    };
  };

}());

/*-----------------------------------------------------------------------------------------*/

(function()
{
  /*-----------------------------------------------------------------------------------------
   * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
   * http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
   * requestAnimationFrame polyfill by Erik Möller
   * fixes from Paul Irish and Tino Zijdel
   *----------------------------------------------------------------------------------------*/
  var lastTime = 0;
  var vendors = ['webkit', 'moz'];
  var x;
  for(x = 0; x < vendors.length && !window.requestAnimationFrame; ++x)
  {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame =
      window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame)
  {
    window.requestAnimationFrame = function(callback)
    {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function(){callback(currTime + timeToCall);}, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame)
  {
    window.cancelAnimationFrame = function(id) {clearTimeout(id);};
  }

}());


