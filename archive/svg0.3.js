var alchemy = alchemy || {};

alchemy.sg = ( function( sg ) {
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
  var yMajorInput = document.getElementById( 'yMajorInput' );
  var yMinorInput = document.getElementById( 'yMinorInput' );
  var graphPane = document.getElementById( 'graphPane' );
  var fontSizeIn = document.getElementById( 'fontSizeIn' );
  var fontSizeOut = document.getElementById( 'fontSizeOut' );
  var stripLabelPosIn = document.getElementById( 'stripLabelPos' );

  var prefs = {};
  prefs.fontSize = 30;
  prefs.strokeColor = [ 'black', 'blue', 'red', 'purple', 'green' ];
  prefs.strokeWidth = 1;
  prefs.stripLabelPos = 'left';
  var graphWidth, graphHeight, plotWidth, plotHeight;
  var scaleX, scaleY, xAxisMin, xAxisMax, yAxisMax;
  var dataFiles = {};
  var icddData = {};
  var axes = {};
  var plots = [];
  var filmStrips = [];
  var projectTitle;
  var graphTitle = 'Graph Title';

  var typeFace = 'Times New Roman, serif',
      labelChoice = 'chemical_formula',
      autoSub = true;


  topMargin = 2 * prefs.fontSize;
  rightMargin = 0.5 * prefs.fontSize;
  xAxisMargin = 3 * prefs.fontSize;
  yAxisMargin = 3 * prefs.fontSize;
  filmStripSize = 1.5 * prefs.fontSize;

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

  addEditListener( customAspect, function( newVal ) {
    /**
     * write custom value to local storage
     */
    aspectRatio = newVal;
    customAspect.blur();
    redraw();
  } );
  addEditListener( xMajorInput, function( newVal ) {
    /**
     * write custom value to local storage
     */
    prefs.xMajor = newVal;
    xMajorInput.blur();
    redraw();
  } );
  addEditListener( xMinorInput, function( newVal ) {
    /**
     * write custom value to local storage
     */
    prefs.xMinor = newVal;
    xMinorInput.blur();
    redraw();
  } );
  addEditListener( yMajorInput, function( newVal ) {
    /**
     * write custom value to local storage
     */
    prefs.yMajor = newVal;
    yMajorInput.blur();
    redraw();
  } );
  addEditListener( yMinorInput, function( newVal ) {
    /**
     * write custom value to local storage
     */
    prefs.yMinor = newVal;
    yMinorInput.blur();
    redraw();
  } );

  var Point = function( x, y ) {
    // In the data, use the actual x,y pairs. 
    // The Point object worries about where it belongs on screen
    this.x = Math.round( 1000 * ( yAxisMargin + x * axes.scaleX ) ) / 1000;
    this.y = Math.round( 1000 * ( topMargin + plotHeight - ( y * axes.scaleY + filmStrips.length * filmStripSize ) ) ) / 1000;
  }

  sg.init = function() {
    makeTitlePanel();
    //makeProjectPanel();
    //redraw();
  }

  var redraw = function() {
    prefs.fontSize = fontSizeIn.value;
    fontSizeOut.value = prefs.fontSize;
    filmStripSize = 1.5 * prefs.fontSize;
    var aspectSelect = document.getElementById( 'aspectRatio' );
    // aspectSelect.selectedIndex = localStorage || 0;
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
    yMajorInput.value = prefs.yMajor ? prefs.yMajor : 5000;
    yMinorInput.value = prefs.yMinor ? prefs.yMinor : 1000;

    plotWidth = graphWidth - ( yAxisMargin + rightMargin );
    plotHeight = graphHeight - ( xAxisMargin + topMargin );
    if( plots.length > 0 ) {
      axes.scaleX = plotWidth / ( axes.xMax - axes.xMin );
      axes.scaleY = ( plotHeight - ( filmStrips.length * filmStripSize + ( plots.length - 1 ) * filmStripSize ) ) / axes.yMax;      
    }
    if( plots.length > 0 ) {
      msgOut( '' );
      makePlot();
      makeControls();
      exportSVG();
      //var storeObj = {};
      //storeObj.plots = plots;
      //storeObj.icddData = icddData;
      //storeObj.filmStrips = filmStrips;
      //localStorage[ projectTitle ] = storeObj;
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

  var makeProjectPanel = function() {
    /*
    var projSelect = document.getElementById( 'projectSelect' );
    for( var i = 0; i < localStorage.length; i++ ) {
      var option = document.createElement( 'option' );
      option.value = localStorage.key( i );
      option.innerText = localStorage.key( i );
      projSelect.add( option ); 
    }
    projSelect.addEventListener( 'change', function() {
      var projObj = localStorage[ projSelect.value ];
      plots = projObj.plots;
      icddData = projObj.icddData;
      filmStrips = projObj.filmStrips;
      redraw();
    } );
    */
  };

  var makeTitlePanel = function() {
    var titlePanel = document.createElement( 'span' );
    titlePanel.id = 'graphTitle';
    titlePanel.title = 'Click to Edit';
    titlePanel.className = 'stripTitle';
    titlePanel.contentEditable = true;
    titlePanel.innerHTML = graphTitle;
    addEditListener( titlePanel, (function() {
      return function( data ) {
        graphTitle = data;
        redraw();
      };
    })() );
    titleDiv.appendChild( titlePanel );
  }

  var makePlotPanel = function() {
    var plotList = document.createElement( 'ul' );
    plotList.id = 'plotList';

    var plotElems = plots.map( function( plot, idx ) {
      var item = document.createElement( 'li' );

      var edit = document.createElement( 'span' );
      edit.title = 'Edit';
      edit.style.cursor = 'pointer';
      edit.className = 'kill';
      edit.addEventListener( 'click', ( function( z, e ) {
        return function() {
          var editPane = document.createElement( 'div' );
          editPane.style.paddingLeft = '5em';
          var left = document.createElement( 'span' );
          left.className = 'kill';
          left.addEventListener( 'click', ( function( z, e ) {
            return function() {
              var temp = plots[ z ];
              // rebuild plots[ z ].spectrum from shifted xVals vs yVals
            };
          }( idx ) ) );
          var right = document.createElement( 'span' );
          editPane.innerHTML = 'Shift 2&theta; <input type="text" size="2" name="xShiftIn" value="0"> °';
          item.appendChild( editPane );
        };
      }( idx ) ) );
      edit.innerHTML = '&#9881;';

      var up = document.createElement( 'span' );
      up.className = 'upDown';
      if( idx === plots.length - 1 ) {
        up.style.opacity = 0;
      } else {
        up.title = 'Move Up';
        up.style.cursor = 'pointer';
        up.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = plots[ z ];
            plots[ z ] = plots[ z + 1 ];
            plots[ z + 1 ] = temp;
            redraw();
          };
        }( idx ) ) );
      }
      up.innerHTML = '&#9650;'

      var down = document.createElement( 'span' );
      down.className = 'upDown';
      if( idx === 0 ) {
        down.style.opacity = 0;
      } else {
        down.title = 'Move Down';
        down.style.cursor = 'pointer';
        down.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = plots[ z ];
            plots[ z ] = plots[ z - 1 ];
            plots[ z - 1 ] = temp;
            redraw();
          };
        }( idx ) ) );
      }
      down.innerHTML = '&#9660;'

      var kill = document.createElement( 'span' );
      kill.title = 'Delete';
      kill.style.cursor = 'pointer';
      kill.className = 'kill';
      kill.addEventListener( 'click', ( function( z, e ) {
        return function() {
          plots.splice( z, 1 );
          redraw();
        };
      }( idx ) ) );
      kill.innerHTML = '&times;';

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

      item.appendChild( edit );
      item.appendChild( up );
      item.appendChild( down );
      item.appendChild( kill );
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

    var stripElems = filmStrips.map( function( icddNum, idx ) {
      var item = document.createElement( 'li' );
      item.id = icddNum;
      var dataObj = icddData[ icddNum ];
      var titleText = dataObj.title ? dataObj.title : dataObj.pdf_data[ labelChoice ];

      if( autoSub ) {
        titleText = titleText.replace( /\s/g, '');
        titleText = titleText.replace( /(\d?\.?\d)\s?/g, function( titleText, match ) {
          return '<sub>' + match + '</sub>';
        } );
      }
      titleText = titleText + ' &mdash; ' + icddNum;

      var up = document.createElement( 'span' );
      up.className = 'upDown';
      if( idx === 0 ) {
        up.style.opacity = 0;
      } else {
        up.title = 'Move Up';
        up.style.cursor = 'pointer';
        up.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = filmStrips[ z ];
            filmStrips[ z ] = filmStrips[ z - 1 ];
            filmStrips[ z - 1 ] = temp;
            redraw();
          };
        }( idx ) ) );
      }
      up.innerHTML = '&#9650;'

      var down = document.createElement( 'span' );
      down.className = 'upDown';
      if( idx === filmStrips.length - 1 ) {
        down.style.opacity = 0;
      } else {
        down.title = 'Move Down';
        down.style.cursor = 'pointer';
        down.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = filmStrips[ z ];
            filmStrips[ z ] = filmStrips[ z + 1 ];
            filmStrips[ z + 1 ] = temp;
            redraw();
          };
        }( idx ) ) );
      }
      down.innerHTML = '&#9660;'

      var kill = document.createElement( 'span' );
      kill.title = 'Delete';
      kill.style.cursor = 'pointer';
      kill.className = 'kill';
      kill.addEventListener( 'click', ( function( z, e ) {
        return function() {
          filmStrips.splice( z, 1 );
          redraw();
        };
      }( idx ) ) );
      kill.innerHTML = '&times;';

      var stripTitle = document.createElement( 'span' );
      //stripTitle.title = 'Click to Edit';
      stripTitle.className = 'stripTitle';
      //stripTitle.contentEditable = true;
      stripTitle.innerHTML = titleText;
      item.appendChild( up );
      item.appendChild( down );
      item.appendChild( kill );
      item.appendChild( stripTitle );
      return item;
    } );

    stripElems.forEach( function( elem, idx ) {
      stripList.appendChild( elem );
    } );

    stripListDiv.appendChild( stripList );
  };

  var loadData = function() {
    var keys = Object.keys( dataFiles );
    keys.forEach( function( key ) {
      var pairs = dataFiles[ key ].split( '\n' );
      if( pairs[ 0 ].indexOf( '\t' ) != -1 ) {
        var delim = '\t';
      } else if( pairs[ 0 ].indexOf( ',' ) != -1 ) {
        var delim = ',';
      } else {
        msgOut( 'Unknown delimiter' );
        return;
      }
      var plot = {};

      var xVals = pairs.map( function( elem ) {
        return elem.split( delim )[ 0 ].trim();  
      } );
      var yVals = pairs.map( function( elem ) {
        return elem.split( delim )[ 1 ].trim();  
      } );

      plot.xMin = Math.min.apply( Math, xVals );
      plot.xMax = Math.max.apply( Math, xVals );
      plot.xShift = 0;
      plot.yMax = Math.max.apply( Math, yVals );

      if( plots.length === 0 ) {
        axes.xMin = plot.xMin;
        axes.xMax = plot.xMax;
        axes.yMax = plot.yMax;
        axes.scaleX = plotWidth / ( plot.xMax - plot.xMin );
        axes.scaleY = ( plotHeight - ( filmStrips.length * filmStripSize ) ) / plot.yMax;
      } else {
        axes.xMin = Math.min( axes.xMin, plot.xMin );
        axes.xMax = Math.max( axes.xMax, plot.xMax );
        axes.yMax = Math.max( axes.yMax, plot.yMax );
        axes.scaleX = plotWidth / ( axes.xMax - axes.xMin );
        axes.scaleY = ( plotHeight - ( filmStrips.length * filmStripSize ) ) / axes.yMax;      
      }

      plot.spectrum = xVals.map( function( elem, idx ) {
        var pt = {};
        pt.x = elem;
        pt.y = yVals[ idx ];
        return pt;
      } );

      plot.fileName = key;

      plots.push( plot );
    } );
  };

  var makePlot = function() {
    var container = document.getElementById( 'svgContainer' );
    if( container ) {
      graphPane.removeChild( container );
    }
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

    drawAxes();
    tickXaxis();
    tickYaxis();
    var titleStr = '';
    for( var i = 0; i < plots.length; i ++ ) {
      var normalize = axes.yMax / plots[ i ].yMax;
      var spectraStr = plots[ i ].spectrum.map( function ( elem ) {
        var pt = new Point( parseFloat( elem.x + plots[ i ].xShift - axes.xMin ), parseInt( normalize * elem.y ) );
        return pt.x + ',' + ( pt.y - ( filmStripSize * i ) );
      } );
      var graph = document.createElementNS( svgNS, 'polyline' );
      graph.setAttributeNS( null, 'style', 'fill: none; stroke: ' + prefs.strokeColor[ i ] + '; stroke-width: ' + prefs.strokeWidth + ';');
      graph.setAttributeNS( null, 'points', spectraStr.join( ' ' ) );
      document.getElementById( 'svgGraph' ).appendChild( graph );
    }
    var title = document.createElementNS( svgNS, 'text' );
    title.setAttributeNS( null, 'x', ( graphWidth / 2 ) + ( yAxisMargin / 2 ) );
    title.setAttributeNS( null, 'y', prefs.fontSize * 1.2 );
    //title.setAttributeNS( null, 'font-family', typeFace );
    title.setAttributeNS( null, 'font-size', prefs.fontSize * 1.2 );
    title.setAttributeNS( null, 'style', 'text-anchor: middle;' );
    title.appendChild( document.createTextNode( graphTitle ) );
    document.getElementById( 'svgGraph' ).appendChild( title );
    projectTitle = titleStr;

    addStrip();
  }

  var addStrip = function() {
    var origin = new Point( 0, 0 );
    filmStrips.forEach( function( data, idx ) {
      var dataObj = icddData[ data ];
      var labelText = dataObj.title ? dataObj.title : dataObj.pdf_data[ labelChoice ];

      var label = document.createElementNS( svgNS, 'text' );
      label.setAttribute( 'font-size', 0.9 * prefs.fontSize );
      label.setAttribute( 'dominant-baseline', 'middle' );
      if( autoSub ) {
		    labelText = labelText.replace(/\s/g,'');
        labelArr = labelText.split( /(\d?\.?\d+)\s?/g );
        labelArr = labelArr.filter( function( elem ) { return ( elem === '' ) ? false : true } );
        labelArr.forEach( function( elem ) {
          var tSpan = document.createElementNS( svgNS, 'tspan' );
          if( /\d?\.?\d+/.test( elem ) ) {
            tSpan.setAttributeNS( null, 'font-size', 0.6 * prefs.fontSize );
            tSpan.setAttributeNS( null, 'baseline-shift', '-25%' );
          }
          tSpan.appendChild( document.createTextNode( elem ) );
          label.appendChild( tSpan );
        } );
      }
      if( prefs.stripLabelPos === 'right' ) {
        label.setAttribute( 'x', plotWidth - label.getBBox().width );
      } else {
        label.setAttribute( 'x', origin.x + 10 );        
      }
      label.setAttribute( 'y', origin.y + filmStripSize * ( idx + 0.7 ) );
      svgGraph.appendChild( label );


      var stripBorder = makeLine( origin.x, origin.y + idx * filmStripSize,
          origin.x + plotWidth, origin.y + idx * filmStripSize );
      svgGraph.appendChild( stripBorder );

      var strip = dataObj.graphs.stick_series.intensity.filter( function( elem ) {
        return ( isNaN( parseInt( elem.intensity ) ) ) ? false : true;
      } );
      var intensities = strip.map( function( peak ) {
        return parseInt( peak.intensity );
      } );
      var strongest = Math.max.apply( Math, intensities );
      strip.forEach( function( peak ) {
        if( peak.theta > axes.xMin && peak.theta < axes.xMax ) {
          var pt = new Point( peak.theta - axes.xMin, 0 );
          var stick = makeLine ( pt.x,
            pt.y + filmStripSize * ( 1 + idx ),
            pt.x,
            pt.y + filmStripSize * ( 1 + idx ) - filmStripSize * parseInt( peak.intensity ) / strongest
          );
          svgGraph.appendChild( stick );
        }
      } );
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

  var tickYaxis = function() {
    prefs.yMajor = parseInt( yMajorInput.value );
    prefs.yMinor = parseInt( yMinorInput.value );
    var erase = svgGraph.querySelectorAll( '.yAxisMark' );
    for( var i = 0; i < erase.length; i++ ) {
      erase[ i ].parentNode.removeChild( erase[ i ] );
    }

    for( var i = 0; i < axes.yMax; i += prefs.yMinor ) {
      var xTick = yAxisMargin;
      var yTick = graphHeight - ( ( i * axes.scaleY ) + xAxisMargin + ( filmStrips.length * filmStripSize ) );
      var tickSize = ( Math.round( i / prefs.yMajor ) === i / prefs.yMajor ) ? 10 : 5;
      var tick = makeLine( xTick, yTick, xTick - tickSize, yTick );
      svgGraph.appendChild( tick );

      /*
      if( tickSize === 10 ) {
        var label = document.createElementNS( svgNS, 'text' );
        label.setAttributeNS( null, 'x', xTick - 20 );
        label.setAttributeNS( null, 'y', yTick );
        label.setAttributeNS( null, 'fill', 'black' );
        label.setAttributeNS( null, 'font-size', prefs.fontSize + 'px' );
        label.setAttributeNS( null, 'style', 'dominant-baseline: middle; text-anchor: end;' );
        label.appendChild( document.createTextNode( i ) );
        svgGraph.appendChild( label );
      }
      */
    }
  };

  var drawAxes = function() {
    var xAxis = makeLine( yAxisMargin, graphHeight - xAxisMargin, graphWidth - rightMargin, graphHeight - xAxisMargin );
    svgGraph.appendChild( xAxis );

    var yAxis = makeLine( yAxisMargin, graphHeight - xAxisMargin, yAxisMargin, topMargin );
    svgGraph.appendChild( yAxis );

    var xLabel = document.createElementNS( svgNS, 'text' );
    xLabel.setAttributeNS( null, 'x', ( graphWidth / 2 ) + ( yAxisMargin / 2 ) );
    xLabel.setAttributeNS( null, 'y', graphHeight - prefs.fontSize * 0.6 );
    xLabel.setAttributeNS( null, 'font-size', prefs.fontSize * 1.1 );
    xLabel.setAttributeNS( null, 'style', 'text-anchor: middle;' );
    xLabel.appendChild( document.createTextNode( '2\u03B8 [\u00B0]' ) );
    svgGraph.appendChild( xLabel );

    var yLabel = document.createElementNS( svgNS, 'text' );
    yLabel.setAttributeNS( null, 'x', prefs.fontSize  );
    yLabel.setAttributeNS( null, 'y', topMargin + ( graphHeight - ( filmStrips.length * filmStripSize + xAxisMargin + topMargin ) ) / 2 );
    yLabel.setAttributeNS( null, 'font-size', prefs.fontSize * 1.1 );
    yLabel.setAttributeNS( null, 'style', 'dominant-baseline: middle; text-anchor: middle;' );
    var transformStr = 'rotate( -90 ' + prefs.fontSize + ',' + ( topMargin + ( graphHeight - ( filmStrips.length * filmStripSize + xAxisMargin + topMargin ) ) / 2 ) + ')';
    yLabel.setAttributeNS( null, 'transform',  transformStr );
    yLabel.appendChild( document.createTextNode( 'Intensity [arb.]' ) );
    svgGraph.appendChild( yLabel );
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
    while( messageDiv.firstChild ) {
      messageDiv.removeChild( messageDiv.firstChild );
    }
    messageDiv.appendChild( document.createTextNode( msg ) );
  };

  var redrawIfLoaded = function( count, numFiles) {
    if( count === numFiles ) {
      loadData();
      dataFiles = {};
      redraw();
    }
  }

  var handleFiles = function( files ) {
    var loadCounter = 0
    for( var i = 0; i < files.length; i++ ) {
      var fReader = new FileReader();
      fReader.onload = ( function( theFile ) {
        return function( e ) {
          var data = e.target.result.trim();
          if( /^\<\?xml/.test( data ) ) {          // ICDD record
            var jsonData = alchemy.x2j.convert( data );
            icddData[ jsonData.pdfcard.pdf_data.pdf_number ] = jsonData.pdfcard;
            filmStrips.push( jsonData.pdfcard.pdf_data.pdf_number );
          } else if( /^[\d+(\.\d?)?\t\d+(\.\d?)?\s?\n]{3,}/.test( data )    // tab delimited
              || /^[\d+(\.\d?)?\,\d+(\.\d?)?\s?\n]{3,}/.test( data ) ) {    // comma delimited
            data = data.replace( /[\r\n]+/g, '\n' );
            dataFiles[ e.target.file.name ] = data;
          } else if( /DATA/.test( data ) ) {      // file with headers from IEC Unit 1
            data = data.replace( /[\r\n]+/g, '\n' );
            data = data.replace( /^[\s\S]*DATA/, '' );
            data = data.replace( /\n\s*\d+\s{1,2}/g, '\n' );
            data = data.replace( /^\n/, '' );
            data = data.replace( /\n\(Undefined\)\s*\d+\s*/, '' );
            data = data.replace( /\ +/g, '\t' );
            dataFiles[ e.target.file.name ] = data;
          } else if ( /2 theta\tcps/.test( data ) ) {       // Sharp Labs file
            data = data.replace( /[\r\n]+/g, '\n' );
            data = data.replace( /^[\s\S]*2 theta\tcps\n/, '' );
            dataFiles[ e.target.file.name ] = data;
          } else {
            msgOut( 'Unknown file type' );
          }
          loadCounter++;
          redrawIfLoaded( loadCounter, files.length );
        }
      }( files[ i ] ) );
      fReader.file = files[ i ];
      fReader.readAsText( files[ i ] );
    }
  };

  var exportSVG = function() {
    exportDiv.innerHTML = '';
    var svg = graphPane.innerHTML;
    var b64 = window.btoa( unescape( encodeURIComponent( svg ) ) );
    var imgOut = document.createElement( 'img' );
    imgOut.width = 200;
    imgOut.src = 'data:image/svg+xml;base64,\n' + b64;
    imgOut.title = 'Right-click and Save As';
    exportDiv.appendChild( imgOut );
  }

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
    handleFiles( e.dataTransfer.files );
  }, false );

  var resizeEnd;
  window.addEventListener( 'resize', function() {
    clearTimeout( resizeEnd );
    resizeEnd = setTimeout( redraw, 200 );
  }, false );

  stripLabelPosIn.addEventListener( 'change', function() {
    prefs.stripLabelPos = stripLabelPosIn.value;
    redraw()
  } );

  fontSizeIn.addEventListener( 'change', function() {
    fontSizeOut.value = fontSizeIn.value;
  })
  fontSizeIn.addEventListener( 'mouseup', function() {
    redraw();
  } );

  return sg;
}( alchemy.sg = alchemy.sg || {} ) );

alchemy.sg.init();


