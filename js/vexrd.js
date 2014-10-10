var alchemy = alchemy || {};

alchemy.vexrd = ( function( vexrd ) {
  var VERSION = 0.7;
  var svgNS = "http://www.w3.org/2000/svg";
  var controlPane = document.getElementById( 'controlPane' );
  var titleDiv = document.getElementById( 'titleDiv' );
  var plotListDiv = document.getElementById( 'plotListDiv' );
  var stripListDiv = document.getElementById( 'stripListDiv' );
  var messageDiv = document.getElementById( 'messageDiv' );
  var exportDiv = document.getElementById( 'exportDiv' );
  var prefsDiv = document.getElementById( 'prefsDiv' );
  var customAspect = document.getElementById( 'customAspect' );
  var xMajorInput = document.getElementById( 'xMajorInput' );
  var xMinorInput = document.getElementById( 'xMinorInput' );
  var graphPane = document.getElementById( 'graphPane' );
  var fontSizeIn = document.getElementById( 'fontSizeIn' );
  var fontSizeOut = document.getElementById( 'fontSizeOut' );
  var lineWeightIn = document.getElementById( 'lineWeightIn' );
  var lineWeightOut = document.getElementById( 'lineWeightOut' );
  var linearPlotBox = document.getElementById( 'linearPlotBox' );
  var semiLogPlotBox = document.getElementById( 'semiLogPlotBox' );
  var linearStripBox = document.getElementById( 'linearStripBox' );
  var semiLogStripBox = document.getElementById( 'semiLogStripBox' );
  var fullHeightStripBox = document.getElementById( 'fullHeightStripBox' );
  var displayYaxis = document.getElementById( 'displayYaxis' );
  var displayLegend = document.getElementById( 'displayLegend' );

  var prefs = {};
  prefs.fontSize = 30;
  prefs.strokeColor = [ 'black', 'blue', 'red', 'purple', 'green', 'orange', 'cyan', 'magenta', 'teal' ];
  //prefs.strokeColor = [ 'black', 'blue', 'red', 'rebeccapurple', 'green', 'orange', 'cyan', 'magenta', 'teal' ];
  prefs.strokeWidth = 1;
  prefs.manualMin = null;
  prefs.manualMax = null;
  var graphWidth, graphHeight, plotWidth, plotHeight;
  var scaleX, scaleY, xAxisMin, xAxisMax, yAxisMax;
  var dataFiles = {};
  var icddData = {};
  var axes = {};
  var plots = [];
  var indexStrips = [];
  var projectTitle;
  var graphTitle = 'Graph Title';

  var typeFace = 'Helvetica, sans-serif',
      labelChoice = 'chemical_formula';

  var addEditListener = function( element, callback ) {
    var oldData = element.value || element.innerHTML;
    element.addEventListener( 'keypress', function( e ) {
      if( e.which === 13 ) {    // enter
        e.preventDefault();
        element.blur();
        callback( element.value || element.innerText );
      } else if( e.which === 27 ) {    // escape
        e.preventDefault();
        element.innerHTML = oldData;
        element.blur();
      }
    }, false );
  };

  var Point = function( x, y ) {
    // In the data, use the actual x,y pairs.
    // The Point object worries about where it belongs on screen
    this.x = Math.round( 1000 * ( yAxisMargin + x * axes.scaleX ) ) / 1000;
    this.y = Math.round( 1000 * ( topMargin + plotHeight - ( y * axes.scaleY + indexStrips.length * indexStripSize ) ) ) / 1000;
  }

  var zeroPad = function( n, width ) {
    n = n + '';
    return n.length >= width ? n : new Array( width - n.length + 1 ).join( '0' ) + n;
  }

  vexrd.init = function() {
    addListeners();
    //makeTitlePanel();
    //makeProjectPanel();
    //redraw();
  }

  var redraw = function() {
    prefs.fontSize = parseInt( fontSizeIn.value );
    prefs.strokeWidth = parseInt( lineWeightIn.value );
    //fontSizeOut.value = prefs.fontSize;
    //prefs.semiLogPlot = semiLogPlotBox.checked ? true : false;
    //prefs.semiLogStrip = semiLogStripBox.checked ? true : false;
    prefs.plotAxis = document.forms.axisChooser.elements.plotAxis.value;
    prefs.stripAxis = document.forms.axisChooser.elements.stripAxis.value;
    prefs.displayYaxis = document.forms.hideStuff.elements.displayYaxis.checked;
    prefs.displayLegend = document.forms.hideStuff.elements.displayLegend.checked;
    //topMargin = 2 * prefs.fontSize;
    topMargin = 10;
    rightMargin = 0.6 * prefs.fontSize;
    xAxisMargin = 2.7 * prefs.fontSize;
    yAxisMargin = 1.5 * prefs.fontSize;
    indexStripSize = 1.5 * prefs.fontSize;
    var aspectSelect = document.getElementById( 'aspectRatio' );
    aspectRatio = ( aspectSelect.value === 'custom' ) ? customAspect.value : aspectSelect.value;
    aspectSelect.addEventListener( 'change', function() {
      if( aspectSelect.value != 'custom' ) {
        customAspect.style.display = 'none';
        aspectRatio = aspectSelect.value;
        redraw();
      } else {
        customAspect.placeholder = aspectRatio === 'un' ? '16:9' : aspectRatio;
        customAspect.style.display = 'block';
      }
    } );
    if( aspectRatio === 0 || aspectRatio.indexOf( ':' ) === -1 ) {
      graphWidth = graphPane.offsetWidth;
      graphHeight = graphPane.offsetHeight;
    } else {
      var dims = aspectRatio.split( ':' );
      var aspectLock = dims[ 0 ] / dims [ 1 ];
      graphWidth = graphPane.offsetWidth;
      graphHeight = graphPane.offsetHeight;
      var curRatio = graphWidth / graphHeight;
      if( curRatio > aspectLock ) {
        graphWidth = graphHeight * aspectLock;
      } else {
        graphHeight = graphWidth / aspectLock;
      }
    }

    xMajorInput.value = prefs.xMajor ? prefs.xMajor : 10;
    xMinorInput.value = prefs.xMinor ? prefs.xMinor : 1;

    plotWidth = graphWidth - ( yAxisMargin + rightMargin );
    plotHeight = graphHeight - ( xAxisMargin + topMargin );
    if( plots.length > 0 ) {
      axes.scaleX = plotWidth / ( axes.xMax - axes.xMin );
      axes.scaleY = ( plotHeight - ( indexStrips.length * indexStripSize + ( plots.length - 1 ) * indexStripSize ) ) / axes.yMax;

      makePlot();
      makeControls();
      exportSVG();
      exportPDF();
    } else {
      msgOut( 'Waiting for data' );
    }
  }

  var makeControls = function() {
    document.getElementById( 'plotListDiv' ).innerHTML = '';
    document.getElementById( 'stripListDiv' ).innerHTML = '';
    makePlotPanel();
    makeStripPanel();
  };

  var makePlotPanel = function() {
    var plotList = document.createElement( 'ul' );
    plotList.id = 'plotList';

    var plotElems = plots.map( function( plot, idx ) {
      var item = document.createElement( 'li' );

      var moveUp = document.createElement( 'span' );
      moveUp.className = 'upDown';
      if( idx === plots.length - 1 ) {
        moveUp.style.opacity = 0;
      } else {
        moveUp.title = 'Move Up List';
        moveUp.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = plots[ z ];
            plots[ z ] = plots[ z + 1 ];
            plots[ z + 1 ] = temp;
            redraw();
          };
        }( idx ) ) );
      }
      moveUp.innerHTML = '&#11014;'

      var moveDown = document.createElement( 'span' );
      moveDown.className = 'upDown';
      if( idx === 0 ) {
        moveDown.style.opacity = 0;
      } else {
        moveDown.title = 'Move Down List';
        moveDown.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = plots[ z ];
            plots[ z ] = plots[ z - 1 ];
            plots[ z - 1 ] = temp;
            redraw();
          };
        }( idx ) ) );
      }
      moveDown.innerHTML = '&#11015;'

      var left = document.createElement( 'span' );
      left.className = 'leftRight';
      left.title = 'Shift Left';
      left.addEventListener( 'click', ( function( z, e ) {
        return function() {
          plots[ z ].xOffset--;
          redraw();
        };
      }( idx ) ) );
      left.innerHTML = '&#9664;';

      var right = document.createElement( 'span' );
      right.className = 'leftRight';
      right.title = 'Shift Right';
      right.addEventListener( 'click', ( function( z, e ) {
        return function() {
          plots[ z ].xOffset++;
          redraw();
        };
      }( idx ) ) );
      right.innerHTML = '&#9654;';

      var shiftUp = document.createElement( 'span' );
      shiftUp.className = 'upDown';
      shiftUp.title = 'Shift Up';
      shiftUp.addEventListener( 'click', ( function( z, e ) {
        return function() {
          plots[ z ].yOffset -= 5;
          if( plots[ z ].yOffset < -0.5 * indexStripSize ) {
            plots[ z ].yOffset = -0.5 * indexStripSize
          }
          redraw();
        };
      }( idx ) ) );
      shiftUp.innerHTML = '&#9650;';

      var shiftDown = document.createElement( 'span' );
      shiftDown.className = 'upDown';
      shiftDown.title = 'Shift Down';
      shiftDown.addEventListener( 'click', ( function( z, e ) {
        return function() {
          plots[ z ].yOffset += 5;
          if( plots[ z ].yOffset > 0.5 * indexStripSize ) {
            plots[ z ].yOffset = 0.5 * indexStripSize
          }
          redraw();
        };
      }( idx ) ) );
      shiftDown.innerHTML = '&#9660;';

      var kill = document.createElement( 'span' );
      kill.title = 'Delete';
      kill.className = 'kill';
      kill.addEventListener( 'click', ( function( z, e ) {
        return function() {
          plots.splice( z, 1 );
          redraw();
        };
      }( idx ) ) );
      kill.innerHTML = '&#x2715;';

      var plotTitle = document.createElement( 'span' );
      plotTitle.title = 'Click to Edit';
      plotTitle.className = 'stripTitle';
      plotTitle.style.color = prefs.strokeColor[ idx ];
      plotTitle.contentEditable = true;
      plotTitle.innerHTML = plot.title ? plot.title : plot.fileName;
      addEditListener( plotTitle, (function( i ) {
        return function( data ) {
          plots[ i ].title = data;
          redraw();
        };
      })( idx ) );

      item.appendChild( kill );
      item.appendChild( moveUp );
      item.appendChild( moveDown );
      item.appendChild( left );
      item.appendChild( right );
      item.appendChild( shiftUp );
      item.appendChild( shiftDown );
      item.appendChild( plotTitle );
      return item;
    } );

    for( j = plotElems.length - 1; j >=0;  j-- ) {
      plotList.appendChild( plotElems[ j ] );
    }

    plotListDiv.appendChild( plotList );
  };

  var makeStripPanel = function() {
    var stripList = document.createElement( 'ul' );
    stripList.id = 'stripList';

    var stripElems = indexStrips.map( function( icddNum, idx ) {
      var item = document.createElement( 'li' );
      item.id = icddNum;
      var dataObj = icddData[ icddNum ];
      var titleText = dataObj.title ? dataObj.title : dataObj.pdf_data[ labelChoice ];


      titleText = titleText.replace( /\s/g, '');
      titleText = titleText.replace( /(\d?\.?\d)\s?/g, function( titleText, match ) {
        return '<sub>' + match + '</sub>';
      } );

      titleText = titleText + ' &ndash; <a href="' + makeICDDcard( icddNum ) + '" target="_blank" title="' + dataObj.pdf_data.xstal_system + '">' + icddNum + '</a>';

      var moveUp = document.createElement( 'span' );
      moveUp.className = 'upDown';
      if( idx === 0 ) {
        moveUp.style.opacity = 0;
      } else {
        moveUp.title = 'Move Up';
        moveUp.style.cursor = 'pointer';
        moveUp.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = indexStrips[ z ];
            indexStrips[ z ] = indexStrips[ z - 1 ];
            indexStrips[ z - 1 ] = temp;
            redraw();
          };
        }( idx ) ) );
      }
      moveUp.innerHTML = '&#11014;'

      var moveDown = document.createElement( 'span' );
      moveDown.className = 'upDown';
      if( idx === indexStrips.length - 1 ) {
        moveDown.style.opacity = 0;
      } else {
        moveDown.title = 'Move Down';
        moveDown.style.cursor = 'pointer';
        moveDown.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = indexStrips[ z ];
            indexStrips[ z ] = indexStrips[ z + 1 ];
            indexStrips[ z + 1 ] = temp;
            redraw();
          };
        }( idx ) ) );
      }
      moveDown.innerHTML = '&#11015;'

      var kill = document.createElement( 'span' );
      kill.title = 'Delete';
      kill.style.cursor = 'pointer';
      kill.className = 'kill';
      kill.addEventListener( 'click', ( function( z, e ) {
        return function() {
          indexStrips.splice( z, 1 );
          redraw();
        };
      }( idx ) ) );
      kill.innerHTML = '&#x2715;';

      var stripTitle = document.createElement( 'span' );
      //stripTitle.title = 'Click to Edit';
      stripTitle.className = 'stripTitle';
      //stripTitle.contentEditable = true;
      stripTitle.innerHTML = titleText;
      item.appendChild( kill );
      item.appendChild( moveUp );
      item.appendChild( moveDown );
      item.appendChild( stripTitle );
      return item;
    } );

    stripElems.forEach( function( elem, idx ) {
      stripList.appendChild( elem );
    } );

    stripListDiv.appendChild( stripList );
  };

  var makeICDDcard = function( icddNum ) {
    var cardData = icddData[ icddNum ].pdf_data;
    var stickData = icddData[ icddNum ].graphs.stick_series;
    var card = [ '<!DOCTYPE html>\n<html>\n<head>\n  <title>' ];
    card.push( cardData.chemical_formula );
    card.push( '</title>\n' );
    card.push( '  <style>body { font-family: Helvetica, Verdana, sans-serif; }\n' );
    card.push( '    td { padding: 0px 4px; text-align: right; }\n  </style>\n')
    card.push( '</head>\n<body>\n<p>' );
    card.push( 'Name: ' + cardData.chemical_name + '<br>\n' );
    card.push( 'Formula: ' + cardData.chemical_formula + '<br>\n' );
    card.push( 'ICDD Number: ' + cardData.pdf_number + '</p>\n<p>' );
    card.push( 'Crystal System: ' + cardData.xstal_system + '<br>\n' );
    card.push( 'Space Group: ' + cardData.xtlsg + '<br>\n' );
    card.push( '</p>\n' );
    card.push( '<table><tr><th>2\u03B8 (°)</th><th>h</th><th>k</th><th>l</th><th>d (nm)</th><th>Int</th></tr>' );
    var intensityLength = stickData.intensity.length;
    for( var i = 0; i < intensityLength; i++ ) {
      var stick = stickData.intensity[ i ];
      card.push( '<tr><td>' + parseFloat( stick.theta ).toFixed( 2 ) + '</td>\n' );
      card.push( '<td>' + stick.h + '</td>\n' );
      card.push( '<td>' + stick.k + '</td>\n' );
      card.push( '<td>' + stick.l + '</td>\n' );
      card.push( '<td>' + parseFloat( stick.da ).toFixed( 3 ) + '</td>\n' );
      card.push( '<td>' + stick.intensity + '</td></tr>\n' );
    }
    card.push( '</table>\n' );
    card.push( '</body>\n</html>')
    var cardURL = window.URL.createObjectURL( new Blob( [ card.join( '' ) ], { "type" : "text\/html" } ) );
    return cardURL;
  }

  var setAxisBounds = function() {
    var xMins = [];
    var xMaxes = [];
    var yMaxes = [];
    var plotsLength = plots.length;
    for( var i = 0; i < plotsLength; i++ ) {
      xMins.push( plots[ i ].xMin );
      xMaxes.push( plots[ i ].xMax );
      yMaxes.push( plots[ i ].yMax );
    }
    axes.xMin = Math.min.apply( Math, xMins );
    axes.xMax = Math.max.apply( Math, xMaxes );

    if( prefs.plotAxis === "semiLog" ) {
      axes.yMax = Math.log( Math.max.apply( Math, yMaxes ) ) / Math.log( 10 );
    } else {
      axes.yMax = Math.max.apply( Math, yMaxes );
    }
    axes.scaleX = plotWidth / ( axes.xMax - axes.xMin );
    axes.scaleY = ( plotHeight - ( indexStrips.length * indexStripSize ) - ( ( plotsLength - 1 ) * indexStripSize ) ) / axes.yMax;
  }

  var makePlot = function() {
    var container = document.getElementById( 'svgContainer' );
    graphPane.innerHTML = '';
    var graphic = document.createElementNS( svgNS, 'svg' );
    graphic.setAttribute( 'xmlns', 'http://www.w3.org/2000/svg' );
    graphic.setAttribute( 'version', '1.1' );
    graphic.setAttribute( 'id', 'svgContainer' );
    var translator = document.createElementNS( svgNS, 'g' );
    translator.setAttributeNS( null, 'transform', 'translate( 0.5, 0.5 )' );
    translator.setAttributeNS( null, 'id', 'svgGraph' );
    graphic.appendChild( translator );

    graphic.setAttribute( 'width', graphWidth );
    graphic.setAttribute( 'height', graphHeight );
    graphic.setAttribute( 'font-family', typeFace );

    graphPane.appendChild( graphic );

    var plotsLength = plots.length
    for( var i = 0; i < plotsLength; i++ ) {
      var plot = plots[ i ];
      var stepSize = plot.xVals[ 1 ] - plot.xVals[ 0 ];
      plot.offsetxVals = plot.xVals.slice();

      if( plot.xOffset < 0 ) {
        for( j = plot.xOffset; j < 0; j++ ) {
          plot.offsetxVals.unshift( plot.offsetxVals[ 0 ] - stepSize );
          plot.offsetxVals.pop();
        }
      } else if( plot.xOffset > 0 ) {
        for( j = 0; j < plot.xOffset; j++ ) {
          plot.offsetxVals.push( plot.offsetxVals[ plot.offsetxVals.length - 1 ] + stepSize );
          plot.offsetxVals.shift();
        }
      }
      plot.xMin = prefs.manualMin ? prefs.manualMin : plot.offsetxVals[ 0 ];
      plot.xMax = prefs.manualMax ? prefs.manualMax : plot.offsetxVals[ plot.offsetxVals.length - 1 ];
      setAxisBounds();
    }

    for( var i = 0; i < plotsLength; i++ ) {
      var plot = plots[ i ];
      var yMin = Math.min.apply( Math, plot.yVals );
      if( prefs.plotAxis === "semiLog" ) {
        var yValsAdj = plot.yVals.map( function( elem, idx ) {
          return Math.log( 1 + plot.yVals[ idx ] - yMin ) / Math.log( 10 );
        } );
        normalize = axes.yMax / ( Math.log( plot.yMax ) / Math.log( 10 ) );
      } else {
        var yValsAdj = plot.yVals.map( function( elem, idx ) {
          return plot.yVals[ idx ] - yMin;
        } );
        normalize = axes.yMax / plot.yMax;
      }

      var spectraStr = plot.offsetxVals.map( function ( elem, idx ) {
        if( elem > plot.xMin && elem < plot.xMax ) {
          var pt = new Point( elem - axes.xMin, normalize * yValsAdj[ idx ] );
          return pt.x.toFixed( 1 ) + ',' + ( pt.y - ( indexStripSize * i ) + plot.yOffset ).toFixed( 1 );
        }
      } );

      var graph = document.createElementNS( svgNS, 'polyline' );
      graph.setAttributeNS( null, 'style', 'fill: none; stroke: ' + prefs.strokeColor[ i ] + '; stroke-width: ' + prefs.strokeWidth + ';' );
      graph.setAttributeNS( null, 'points', spectraStr.join( ' ' ) );
      document.getElementById( 'svgGraph' ).appendChild( graph );

      if( prefs.displayLegend ) {
        var plotTitle = document.createElementNS( svgNS, 'text' );
        plotTitle.setAttribute( 'x',  plotWidth + yAxisMargin - 60 );
        plotTitle.setAttribute( 'y', topMargin + prefs.fontSize + ( ( plots.length - 1 ) * indexStripSize * 0.8 ) - ( indexStripSize * i  * 0.8 ) );
        plotTitle.setAttribute( 'font-size', prefs.fontSize * 0.8 );
        plotTitle.setAttribute( 'style', 'text-anchor: end; stroke: none; fill: black;' );
        plotTitle.appendChild( document.createTextNode( plot.title ) );
        document.getElementById( 'svgGraph' ).appendChild( plotTitle );

        var sparkLinePeakIdx = plot.yVals.indexOf( plot.yMax );
        var sparkLineSize = plot.yVals.length < 100 ? plot.yVals.length : 100;
        if( sparkLinePeakIdx < sparkLineSize / 2 ) {
          sparkLinePeakIdx += ( ( sparkLineSize / 2 ) - sparkLinePeakIdx );
        } else if( sparkLinePeakIdx > (plot.yVals.length - ( sparkLineSize / 2 ) ) ) {
          sparkLinePeakIdx -= ( ( sparkLineSize / 2 ) - ( plot.yVals.length - sparkLinePeakIdx ) );
        }
        var sparkLineStart = sparkLinePeakIdx - ( sparkLineSize / 2 );
        var sparkLineStr = [];
        if( prefs.plotAxis === "semiLog" ) {
          var sparkNorm = indexStripSize * 0.5 / ( Math.log( plot.yMax ) / Math.log( 10 ) );
        } else {
          var sparkNorm = indexStripSize * 0.5 / plot.yMax;
        }
        for( var j = 0; j < sparkLineSize; j++ ) {
          var ptX = ( yAxisMargin + plotWidth - ( sparkLineSize / 2 ) ) + 0.5 * j;
          var ptY = Math.round( 1000 * ( topMargin + prefs.fontSize + ( ( plots.length - 1 ) * indexStripSize * 0.8 ) - ( indexStripSize * i  * 0.8 ) - ( sparkNorm * yValsAdj[ sparkLineStart + j ] ) ) ) / 1000;
          sparkLineStr[ j ] = ptX + ',' + ptY;
        }
        var sparkLine = document.createElementNS( svgNS, 'polyline' );
        sparkLine.setAttributeNS( null, 'style', 'fill: none; stroke: ' + prefs.strokeColor[ i ] + '; stroke-width: ' + prefs.strokeWidth + ';' );
        sparkLine.setAttributeNS( null, 'points', sparkLineStr.join( ' ' ) );
        document.getElementById( 'svgGraph' ).appendChild( sparkLine );
      }
    }

    drawAxes();
    tickXaxis();
    addStrip();
  }

  var addStrip = function() {
    var origin = new Point( 0, 0 );
    indexStrips.forEach( function( icddNum, idx ) {
      var dataObj = icddData[ icddNum ];
      var labelText = dataObj.title ? dataObj.title : dataObj.pdf_data[ labelChoice ];

      var label = document.createElementNS( svgNS, 'text' );
      label.setAttribute( 'font-size', 0.9 * prefs.fontSize + 'px' );
      label.setAttribute( 'dominant-baseline', 'middle' );

      // Subscript all numbers in chemical formula
    labelText = labelText.replace(/\s/g,'');
      labelArr = labelText.split( /(\d?\.?\d+)\s?/g );
      labelArr = labelArr.filter( function( elem ) { return ( elem === '' ) ? false : true } );
      labelArr.forEach( function( elem ) {
        var tSpan = document.createElementNS( svgNS, 'tspan' );
        if( /\d?\.?\d+/.test( elem ) ) {
          tSpan.setAttributeNS( null, 'font-size', 0.6 * prefs.fontSize + 'px' );
          tSpan.setAttributeNS( null, 'baseline-shift', '-25%' );
        } else {
          tSpan.setAttributeNS( null, 'font-size', 0.9 * prefs.fontSize + 'px' );
        }
        tSpan.appendChild( document.createTextNode( elem ) );
        label.appendChild( tSpan );
      } );

      label.setAttribute( 'x', origin.x + 10 );
      label.setAttribute( 'y', origin.y + indexStripSize * ( idx + 0.7 ) );
      svgGraph.appendChild( label );


      var icddIdx = document.createElementNS( svgNS, 'text' );
      icddIdx.setAttribute( 'style', 'text-anchor: end;' );
      icddIdx.setAttribute( 'font-size', 0.5 * prefs.fontSize );
      icddIdx.setAttribute( 'dominant-baseline', 'middle' );
      icddIdx.appendChild( document.createTextNode( icddNum ) );
      icddIdx.setAttribute( 'x', plotWidth + yAxisMargin - 10 );
      icddIdx.setAttribute( 'y', origin.y + indexStripSize * ( idx + 0.3 ) );
      svgGraph.appendChild( icddIdx );


      var stripBorder = makeLine( origin.x, origin.y + idx * indexStripSize,
          origin.x + plotWidth, origin.y + idx * indexStripSize );
      svgGraph.appendChild( stripBorder );

      var strip = dataObj.graphs.stick_series.intensity.filter( function( elem ) {
        return ( isNaN( parseInt( elem.intensity ) ) ) ? false : true;
      } );
      var intensities = strip.map( function( peak ) {
        peak.intensity = parseInt( peak.intensity );
        if( prefs.stripAxis === "semiLog" ) {
          if( peak.intensity === 1 ) {
            peak.intensity += 0.5;
          }
          return Math.log( peak.intensity ) / Math.log( 10 );
        } else if( prefs.stripAxis === "fullHeight" ) {
          return 1;
        } else {
          return peak.intensity;
        }
      } );
      var strongest = Math.max.apply( Math, intensities );

      // var dataTable = '<table border=1 cellspacing=0><tr><td>2theta</td><td>h</td><td>k</td><td>l</td><td>I</td></tr>';
      strip.forEach( function( peak, stickIdx ) {
        if( peak.theta > axes.xMin && peak.theta < axes.xMax ) {
          // dataTable += '<tr><td>' + peak.theta + '</td><td>' + peak.h + '</td><td>' + peak.k + '</td><td>' + peak.l + '</td><td>' + peak.intensity + '</td><td>' + intensities[ stickIdx ] + '</td></tr>';
          var pt = new Point( peak.theta - axes.xMin, 0 );
          if( ( indexStripSize * intensities[ stickIdx ] / strongest ) < 1 ) {
            var stickPx = 1;
          } else {
            var stickPx = indexStripSize * intensities[ stickIdx ] / strongest;
          }
          var stick = makeLine ( pt.x,
                                 pt.y + indexStripSize * ( 1 + idx ),
                                 pt.x,
                                 pt.y + indexStripSize * ( 1 + idx ) - stickPx
          );
          svgGraph.appendChild( stick );
        }
      } );
      // dataTable += '</table>'
      // msgOut( dataTable );

    } );
  };

  var tickXaxis = function() {
    prefs.xMajor = parseInt( xMajorInput.value );
    prefs.xMinor = parseInt( xMinorInput.value );
    var firstTick = prefs.xMinor * Math.ceil( axes.xMin / prefs.xMinor );
    var shiftTick = firstTick - axes.xMin;
    var lastTick = prefs.xMinor * Math.floor( axes.xMax / prefs.xMinor );
    for( var i = firstTick; i <= lastTick; i += prefs.xMinor ) {
      var xTick = ( ( i - firstTick + shiftTick ) * axes.scaleX ) + yAxisMargin;
      var yTick = graphHeight - xAxisMargin;
      var tickSize = ( Math.round( i / prefs.xMajor ) === i / prefs.xMajor ) ? 10 : 5;
      var tick = makeLine( xTick, yTick, xTick, yTick + tickSize );
      svgGraph.appendChild( tick );

      if( tickSize === 10 ) {
        var label = document.createElementNS( svgNS, 'text' );
        label.setAttributeNS( null, 'x', xTick );
        label.setAttributeNS( null, 'y', yTick + tickSize + parseInt( prefs.fontSize ) );
        label.setAttributeNS( null, 'fill', 'black' );
        label.setAttributeNS( null, 'font-size', prefs.fontSize + 'px' );
        label.setAttributeNS( null, 'style', 'text-anchor: middle;' );
        label.appendChild( document.createTextNode( i ) );
        svgGraph.appendChild( label );
      }
    }
  };

  var drawAxes = function() {
    var xAxis = makeLine( yAxisMargin, graphHeight - xAxisMargin, graphWidth - rightMargin, graphHeight - xAxisMargin );
    svgGraph.appendChild( xAxis );

    var xLabel = document.createElementNS( svgNS, 'text' );
    xLabel.setAttributeNS( null, 'x', ( graphWidth / 2 ) + ( yAxisMargin / 2 ) );
    xLabel.setAttributeNS( null, 'y', graphHeight - xAxisMargin * 0.1 );
    xLabel.setAttributeNS( null, 'font-size', prefs.fontSize * 0.9 + 'px' );
    xLabel.setAttributeNS( null, 'style', 'text-anchor: middle;' );
    xLabel.appendChild( document.createTextNode( '2-theta [degrees]' ) );
    svgGraph.appendChild( xLabel );

    if( prefs.displayYaxis ) {
      var yAxis = makeLine( yAxisMargin, graphHeight - xAxisMargin, yAxisMargin, topMargin );
      svgGraph.appendChild( yAxis );

      var yLabel = document.createElementNS( svgNS, 'text' );
      yLabel.setAttributeNS( null, 'x', prefs.fontSize * 0.7 );
      yLabel.setAttributeNS( null, 'y', topMargin + ( plotHeight - indexStrips.length * indexStripSize ) / 2 );
      yLabel.setAttributeNS( null, 'font-size', prefs.fontSize * 0.9 + 'px' );
      yLabel.setAttributeNS( null, 'style', 'dominant-baseline: middle; text-anchor: middle;' );
      var transformStr = 'rotate( -90 ' + prefs.fontSize * 0.7 + ',' + ( topMargin + ( plotHeight - indexStrips.length * indexStripSize ) / 2 ) + ')';
      yLabel.setAttributeNS( null, 'transform',  transformStr );
      var intensityUnit = plots.length > 1 ? 'normalized' : 'arbitrary';
      yLabel.appendChild( document.createTextNode( 'Intensity [' + intensityUnit + ']' ) );
      svgGraph.appendChild( yLabel );
    }
  };

  var makeLine = function( x1, y1, x2, y2 ) {
    var line = document.createElementNS( svgNS, 'line' );
    line.setAttributeNS( null, 'x1', Math.round( 1000 * x1 ) / 1000 );
    line.setAttributeNS( null, 'y1', Math.round( 1000 * y1 ) / 1000 );
    line.setAttributeNS( null, 'x2', Math.round( 1000 * x2 ) / 1000 );
    line.setAttributeNS( null, 'y2', Math.round( 1000 * y2 ) / 1000 );
    line.setAttributeNS( null, 'style', 'stroke: black; stroke-width: ' + prefs.strokeWidth + ';');
    return line;
  }

  var msgOut = function( msg ) {
    if( messageDiv.firstChild ) {
      messageDiv.firstChild.style.color = '#999';
    }
    var elem = document.createElement( 'div' );
    elem.innerHTML = msg;
    messageDiv.insertBefore( elem, messageDiv.firstChild );
  };

  var importFiles = function( files ) {
    var loadCounter = 0;
    var filesLength = files.length;
    for( var i = 0; i < filesLength; i++) {
      var fReader = new FileReader();
      fReader.onload = ( function( theFile ) {
        return function( e ) {
          var fileContents = e.target.result.trim();
          fileContents = fileContents.replace( /\r\n/g, '\n' );
          fileContents = fileContents.replace( /\r/g, '\n' );
          if( /^\<\?xml/.test( fileContents ) && fileContents.indexOf( '<pdfcard' ) !== -1 ) {          // ICDD record
            var jsonData = alchemy.x2j.convert( fileContents );
            icddData[ jsonData.pdfcard.pdf_data.pdf_number ] = jsonData.pdfcard;
            indexStrips.unshift( jsonData.pdfcard.pdf_data.pdf_number );
          } else if( plots.length < 9 ) {
            var aContents = fileContents.split( '\n' );
            if( aContents.length < 40 ) {
              msgOut( 'Unknown file format: ' + e.target.file.name );
            } else {
              var aData = aContents.map( function( line ) {
                return line.trim().split( /\s+/ );
              } );
              var aTestData = aData.slice( aData.length / 2, 5 + aData.length / 2 );
              for( var j = 0; j < aTestData[ 4 ].length - 1; j++ ) {
                var diff43 = ( aTestData[ 4 ][ j ] - aTestData[ 3 ][ j ] ).toFixed( 4 ),
                    diff32 = ( aTestData[ 3 ][ j ] - aTestData[ 2 ][ j ] ).toFixed( 4 ),
                    diff21 = ( aTestData[ 2 ][ j ] - aTestData[ 1 ][ j ] ).toFixed( 4 ),
                    diff10 = ( aTestData[ 1 ][ j ] - aTestData[ 0 ][ j ] ).toFixed( 4 );
                if(   diff43 > 0
                   && diff43 < 1
                   && diff43 === diff32
                   && diff32 === diff21
                   && diff21 === diff10 ) {
                  var twoThetaCol = j;
                  var stepSize = diff43;
                  break;
                }
              }
              if( twoThetaCol === undefined || stepSize === undefined ) {
                msgOut( 'Unknown file format: ' + e.target.file.name );
              } else {
                while( ( aData[ 1 ][ twoThetaCol ] - aData[ 0 ][ twoThetaCol ]).toFixed( 4 ) != stepSize ) {
                  aData.shift();
                }

                var plot = {};
                plot.xVals = [];
                plot.yVals = [];
                aData.forEach( function( elem ) {
                  try {
                    var twoTheta = parseFloat( elem[ twoThetaCol ] );
                    var intensity = parseInt( elem[ twoThetaCol + 1 ] );
                    if( !isNaN( twoTheta ) ) {
                      plot.xVals.push( twoTheta );
                      plot.yVals.push( intensity );
                    }
                  } catch( err ) {
                    msgOut( 'Data corruption detected' );
                  }
                } );
                plot.xOffset = 0;
                plot.yOffset = 0;

                plot.xMin = Math.min.apply( Math, plot.xVals );
                plot.xMax = Math.max.apply( Math, plot.xVals );
                plot.yMax = Math.max.apply( Math, plot.yVals );

                plot.fileName = e.target.file.name;
                plot.title = e.target.file.name.replace( /\.txt/, '' );

                plots.push( plot );
              }
            }
          } else if( plots.length >= 9 ) {
            msgOut( 'Too many XRD plots: max = 9' );
          }
          loadCounter++;
          if( loadCounter === files.length ) {
            redraw();
          }
        }
      }( files[ i ] ) );
      fReader.file = files[ i ];
      fReader.readAsText( files[ i ] );
    }
  };

  var exportSVG = function() {
    var imgURL = window.URL.createObjectURL( new Blob( [ graphPane.innerHTML ], { "type" : "image\/svg+xml" } ) );
    var imgAnchor = document.createElement( 'a' );
    imgAnchor.setAttribute( 'download', 'veXRD.svg' );
    imgAnchor.setAttribute( 'href', imgURL );
    imgAnchor.setAttribute( 'class', 'fakeButton' );
    imgAnchor.innerHTML = 'save .svg';
    exportDiv.innerHTML = '';
    exportDiv.appendChild( imgAnchor );

  };

  var exportPDF = function() {
    var container = document.getElementById( 'svgContainer' );
    var svgWidth = container.getAttribute( 'width' );
    var svgHeight = container.getAttribute( 'height' );
    var lines = graphPane.getElementsByTagNameNS( 'http://www.w3.org/2000/svg', 'line' );
    var polylines = graphPane.getElementsByTagNameNS( 'http://www.w3.org/2000/svg', 'polyline' );
    var textnodes = graphPane.getElementsByTagNameNS( 'http://www.w3.org/2000/svg', 'text' );

    var lineStream = [ 'stream\n' ];
    lineStream.push( prefs.strokeWidth + ' w\n' );
    lineStream.push( '0.0 0.0 0.0 RG\n')
    var linesLength = lines.length;
    for( var i = 0; i < linesLength; i++ ) {
      lineStream.push( lines[ i ].x1.baseVal.value.toFixed( 1 ) + ' ' + ( svgHeight - lines[ i ].y1.baseVal.value ).toFixed( 1 ) );
      lineStream.push( ' m\n' );
      lineStream.push( lines[ i ].x2.baseVal.value.toFixed( 1 ) + ' ' + ( svgHeight - lines[ i ].y2.baseVal.value ).toFixed( 1 ) );
      lineStream.push( ' l S\n' );
    }
    var polylinesLength = polylines.length;
    for( var i = 0; i < polylinesLength; i++ ) {
      lineStream.push( prefs.strokeWidth + ' w\n' );
      var strokeColor = polylines[ i ].style.stroke.replace( 'rgb(', '' );
      strokeColor = strokeColor.replace( ')', '' );
      var aRGB = strokeColor.split( ',' ).map( function( elem ) {
        return parseInt( elem );
      } );
      lineStream.push( ( aRGB[ 0 ] / 255 ) + ' ' + ( aRGB[ 1 ] / 255 ) + ' ' + ( aRGB[ 2 ] / 255 )  + ' RG\n' );
      lineStream.push( polylines[ i ].points[ 0 ].x.toFixed( 1 ) + ' ' + ( svgHeight - polylines[ i ].points[ 0 ].y ).toFixed( 1 ) );
      lineStream.push( ' m\n' );
      for( var j = 1; j < polylines[ i ].points.length; j++ ) {
        lineStream.push( polylines[ i ].points[ j ].x.toFixed( 1 ) + ' ' + ( svgHeight - polylines[ i ].points[ j ].y ).toFixed( 1 ) );
        lineStream.push( ' l\n' );
      }
      lineStream.push( 'S\n' );
    }
    lineStream.push( 'endstream\n' );

    var textStream = [ 'stream\n' ];
    textStream.push( 'BT\n' );
    var textnodesLength = textnodes.length;
    for( var i = 0; i < textnodesLength; i++ ) {
      var tspans = textnodes[ i ].getElementsByTagNameNS( 'http://www.w3.org/2000/svg', 'tspan' );
      var tspansLength = tspans.length;
      if( tspansLength > 0 ) {
        for( var j = 0; j < tspansLength; j++ ) {
          textStream.push( '/F1 ' + parseInt( tspans[ j ].attributes.getNamedItem( 'font-size' ).value ) + ' Tf\n' );
          var x = tspans[ j ].offsetLeft;
          var y = ( svgHeight - tspans[ j ].offsetTop - 0.75 * tspans[ j ].offsetHeight ).toFixed( 1 );
          textStream.push( x + ' ' + y + ' Td\n' );
          textStream.push( '(' + tspans[ j ].innerHTML + ') Tj\n');
          textStream.push( '-' + x + ' -' + y + ' Td\n' );
        }
      } else {
        textStream.push( '/F1 ' + parseInt( textnodes[ i ].attributes.getNamedItem( 'font-size' ).value ) + ' Tf\n' );
        if( textnodes[ i ].transform.baseVal.length > 0 ) {
          var x = textnodes[ i ].x.baseVal[ 0 ].value;
          var y = ( svgHeight - textnodes[ i ].y.baseVal[ 0 ].value - 0.5 * textnodes[ i ].scrollWidth ).toFixed( 1 );
          textStream.push( '0 1 -1 0 ' + x + ' ' + y + ' Tm\n' );
          textStream.push( '(' + textnodes[ i ].innerHTML + ') Tj\n');
          textStream.push( '1 0 0 1 0 0 Tm\n' );
        } else {
          var textAnchor = textnodes[ i ].style.textAnchor;
          if( textAnchor === 'end' ) {
            var offsetX = textnodes[ i ].scrollWidth;
          } else if( textAnchor === 'middle' ) {
            var offsetX = textnodes[ i ].scrollWidth / 2;
          }
          var x = ( textnodes[ i ].x.baseVal[ 0 ].value - offsetX ).toFixed( 1 );
          var y = ( svgHeight - textnodes[ i ].y.baseVal[ 0 ].value ).toFixed( 1 );
          textStream.push( x + ' ' + y + ' Td\n' );
          textStream.push( '(' + textnodes[ i ].innerHTML + ') Tj\n');
          textStream.push( '-' + x + ' -' + y + ' Td\n' );
        }
      }
    }
    textStream.push( 'ET\n' );
    textStream.push( 'endstream\n' );

    var xref = [ '0000000000 65535 f\n' ];

    var pdfFile = [ '%PDF-1.4\n%áéëÓ\n' ];
    var charCount = 17;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '1 0 obj\n' );
    pdfFile.push( '<< /Type /Catalog /Pages 3 0 R>>\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '2 0 obj\n' );
    pdfFile.push( '<< /Type /Pages /Kids [3 0 R] /Count 1>>\n');
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '3 0 obj\n' );
    pdfFile.push( '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + svgWidth + ' ' + svgHeight + '] /Contents [5 0 R 6 0 R] /Resources << /ProcSet 4 0 R /Font <</F1 7 0 R>> >> >>\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '4 0 obj\n' );
    pdfFile.push( '[/PDF /Text]\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '5 0 obj\n' );
    pdfFile.push( '<</Length ' + lineStream.join( '' ).length + '>>\n' );
    pdfFile.push( lineStream.join( '' ) + '\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '6 0 obj\n' );
    pdfFile.push( '<</Length ' + textStream.join( '' ).length + '>>\n' );
    pdfFile.push( textStream.join( '' ) + '\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '7 0 obj\n' );
    pdfFile.push( '<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica /Encoding /MacRomanEncoding >>\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '8 0 obj\n' );
    pdfFile.push( '(veXRD ' + VERSION + ', copyright 2014 by Thomas C. Mangan)\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '9 0 obj\n' );
    pdfFile.push( '(' + window.navigator.userAgent + ')\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );

    pdfFile.push( '10 0 obj\n' );
    pdfFile.push( '<< /Producer 8 0 R /Creator 9 0 R >>\n' );
    pdfFile.push( 'endobj\n' );
    charCount = pdfFile.join( '' ).length;
    xref.push( zeroPad( charCount, 10 ) + ' 00000 n\n' );



    xref.unshift( '0 ' + xref.length + '\n' );
    xref.unshift( 'xref\n' );
    pdfFile.push( xref.join( '' ) );
    pdfFile.push( 'trailer\n' );
    pdfFile.push( '<< /Size ' + (xref.length - 2) + ' /Root 1 0 R>>\n');
    pdfFile.push( 'startxref\n' );
    pdfFile.push( charCount + '\n' );
    pdfFile.push( '%%EOF' );

    var pdfURL = window.URL.createObjectURL( new Blob( [ pdfFile.join( '' ) ], { "type" : "application\/pdf" } ) );
    var pdfAnchor = document.createElement( 'a' );
    pdfAnchor.setAttribute( 'download', 'veXRD.pdf' );
    pdfAnchor.setAttribute( 'href', pdfURL );
    pdfAnchor.setAttribute( 'class', 'fakeButton' );
    pdfAnchor.innerHTML = 'save .pdf';
    //exportDiv.innerHTML = '';
    exportDiv.appendChild( pdfAnchor );
  };

  var addListeners = function() {
    addEditListener( customAspect, function( newVal ) {
      /**
       * write custom value to local storage
       */
      aspectRatio = newVal;
      customAspect.blur();
      redraw();
    } );
    addEditListener( xMinInput, function( newVal ) {
      /**
       * write custom value to local storage
       */
      prefs.manualMin = newVal;
      xMinInput.blur();
      redraw();
    } );
    addEditListener( xMaxInput, function( newVal ) {
      /**
       * write custom value to local storage
       */
      prefs.manualMax = newVal;
      xMaxInput.blur();
      redraw();
    } );
    addEditListener( xMajorInput, function( newVal ) {
      /**
       * write custom value to local storage
       */
      prefs.xMajor = newVal >= 1 ? newVal : 1;
      xMajorInput.blur();
      redraw();
    } );
    addEditListener( xMinorInput, function( newVal ) {
      /**
       * write custom value to local storage
       */
      prefs.xMinor = newVal >= 1 ? newVal : 1;
      xMinorInput.blur();
      redraw();
    } );

    graphPane.addEventListener( 'dragenter', function(e) {
      e.stopPropagation();
      e.preventDefault();
    }, false );
    graphPane.addEventListener( 'dragover', function(e) {
      e.stopPropagation();
      e.preventDefault();
    }, false );
    graphPane.addEventListener( 'drop', function(e) {
      e.stopPropagation();
      e.preventDefault();
      //handleFiles( e.dataTransfer.files );
      importFiles( e.dataTransfer.files );
    }, false );

    var resizeEnd;
    window.addEventListener( 'resize', function() {
      clearTimeout( resizeEnd );
      resizeEnd = setTimeout( redraw, 200 );
    }, false );

    fontSizeIn.addEventListener( 'mouseup', function() {
      redraw();
    } );
    lineWeightIn.addEventListener( 'mouseup', function() {
      redraw();
    } );
    linearPlotBox.addEventListener( 'change', function() {
      redraw();
    } );
    semiLogPlotBox.addEventListener( 'change', function() {
      redraw();
    } );
    linearStripBox.addEventListener( 'change', function() {
      redraw();
    } );
    semiLogStripBox.addEventListener( 'change', function() {
      redraw();
    } );
    fullHeightStripBox.addEventListener( 'change', function() {
      redraw();
    } );
    displayYaxis.addEventListener( 'change', function() {
      redraw();
    } );
    displayLegend.addEventListener( 'change', function() {
      redraw();
    } );
  };

  return vexrd;
}( alchemy.vexrd = alchemy.vexrd || {} ) );

alchemy.vexrd.init();
