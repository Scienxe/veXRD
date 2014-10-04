var alchemy = alchemy || {};

alchemy.sg = ( function( sg ) {
  var svgNS = "http://www.w3.org/2000/svg";
  var controlPane = document.getElementById( 'controlPane' );
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

  var xMajor, xMinor, yMajor, yMinor;
  var graphWidth, graphHeight, plotWidth, plotHeight;
  var scaleX, scaleY, xAxisMin, xAxisMax, yAxisMax;
  var dataFiles = {};
  var icddData = {};
  var axes = {};
  var plots = [];
  var filmStrips = [];

  topMargin = 2 * fontSize;
  rightMargin = 0.5 * fontSize;
  xAxisMargin = 4 * fontSize;
  yAxisMargin = 3 * fontSize;
  filmStripSize = 2 * fontSize;

  var addEditListener = function( element, callback ) {
    var oldData = element.value || element.innerHTML;
    element.addEventListener( 'keypress', function( e ) {
      if( e.which === 13 ) {    // enter
        e.preventDefault();
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
    sg.init();
  } );
  addEditListener( xMajorInput, function( newVal ) {
    /**
     * write custom value to local storage
     */
    xMajor = newVal;
    xMajorInput.blur();
    sg.init();
  } );
  addEditListener( xMinorInput, function( newVal ) {
    /**
     * write custom value to local storage
     */
    xMinor = newVal;
    xMinorInput.blur();
    sg.init();
  } );
  addEditListener( yMajorInput, function( newVal ) {
    /**
     * write custom value to local storage
     */
    yMajor = newVal;
    yMajorInput.blur();
    sg.init();
  } );
  addEditListener( yMinorInput, function( newVal ) {
    /**
     * write custom value to local storage
     */
    yMinor = newVal;
    yMinorInput.blur();
    sg.init();
  } );

  var Point = function( x, y ) {
    // In the data, use the actual x,y pairs. 
    // The Point object worries about where it belongs on screen
    this.x = yAxisMargin + x * axes.scaleX;
    this.y = topMargin + plotHeight - ( y * axes.scaleY + filmStrips.length * filmStripSize );
  }

  sg.init = function() {
    var aspectSelect = document.getElementById( 'aspectRatio' );
    // aspectSelect.selectedIndex = localStorage || 0;
    aspectRatio = ( aspectSelect.value === 'custom' ) ? customAspect.value : aspectSelect.value;
    aspectSelect.addEventListener( 'change', function() {
      /**
       * write new value to local storage
       */
      if( aspectSelect.value != 'custom' ) {
        customAspect.style.display = 'none';
        aspectRatio = aspectSelect.value;
        sg.init();
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

    xMajorInput.value = xMajor ? xMajor : 10;
    xMinorInput.value = xMinor ? xMinor : 1;
    yMajorInput.value = yMajor ? yMajor : 5000;
    yMinorInput.value = yMinor ? yMinor : 1000;

    plotWidth = graphWidth - ( yAxisMargin + rightMargin );
    plotHeight = graphHeight - ( xAxisMargin + topMargin );
    if( plots.length > 0 ) {
      axes.scaleX = plotWidth / ( axes.xMax - axes.xMin );
      axes.scaleY = ( plotHeight - ( filmStrips.length * filmStripSize ) ) / axes.yMax;      
    }
    if( plots.length > 0 ) {
      msgOut( '' );
      makePlot();
      makeControls();
      exportSVG();
    } else {
      msgOut( 'Waiting for data' );
    }
  }

  var makeControls = function() {
    document.getElementById( 'plotListDiv' ).innerHTML = '';
    document.getElementById( 'stripListDiv' ).innerHTML = '';
    for( var i = 0; i < plots.length; i++ ) {
      makePlotPanel( plots[ i ] );
    }
    makeStripPanel();
  };

  var makePlotPanel = function( plot ) {
    var plotPanel = document.createElement( 'div' );
    var plotTitle = document.createElement( 'div' );
    plotTitle.title = 'Click to Edit';
    plotTitle.contentEditable = true;
    plotTitle.innerHTML = plot.title ? plot.title : plot.fileName;
    addEditListener( plotTitle, function( data ) {
      plot.title = data;
      sg.init();
    } );
    plotPanel.appendChild( plotTitle );
    plotListDiv.appendChild( plotPanel );
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
        titleText = titleText.replace( /(\d+)\s?/g, function( titleText, match1 ) {
          switch ( match1 ) {
            case '0': return '\u2080';
            case '1': return '\u2081';
            case '2': return '\u2082';
            case '3': return '\u2083';
            case '4': return '\u2084';
            case '5': return '\u2085';
            case '6': return '\u2086';
            case '7': return '\u2087';
            case '8': return '\u2088';
            case '9': return '\u2089';
          }
        } );
      }

      var up = document.createElement( 'span' );
      up.title = 'Move Up';
      up.style.cursor = 'pointer';
      up.className = 'upDown';
      if( idx === 0 ) {
        up.style.opacity = 0;
      } else {
        up.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = filmStrips[ z ];
            filmStrips[ z ] = filmStrips[ z - 1 ];
            filmStrips[ z - 1 ] = temp;
            sg.init();
          };
        }( idx ) ) );
      }
      up.innerHTML = '&#9650;'

      var down = document.createElement( 'span' );
      down.title = 'Move Down';
      down.style.cursor = 'pointer';
      down.className = 'upDown';
      if( idx === filmStrips.length - 1 ) {
        down.style.opacity = 0;
      } else {
        down.addEventListener( 'click', ( function( z, e ) {
          return function() {
            var temp = filmStrips[ z ];
            filmStrips[ z ] = filmStrips[ z + 1 ];
            filmStrips[ z + 1 ] = temp;
            sg.init();
          };
        }( idx ) ) );
      }
      down.innerHTML = '&#9660;'

      var kill = document.createElement( 'kill' );
      kill.title = 'Delete';
      kill.style.cursor = 'pointer';
      kill.className = 'kill';
      kill.addEventListener( 'click', ( function( z, e ) {
        return function() {
          filmStrips.splice( z, 1 );
          sg.init();
        };
      }( idx ) ) );
      kill.innerHTML = '&times;';

      var stripTitle = document.createElement( 'span' );
      stripTitle.title = 'Click to Edit';
      stripTitle.className = 'stripTitle';
      stripTitle.contentEditable = true;
      stripTitle.innerHTML = titleText;
      item.appendChild( up );
      item.appendChild( down );
      item.appendChild( kill );
      item.appendChild( stripTitle );
      return item;
    } );

    stripListDiv.appendChild( stripList );

    stripElems.forEach( function( elem, idx ) {
      stripList.appendChild( elem );
      addEditListener( elem.lastChild, ( function( z ) {
        return function( data ) {
          icddData[ stripElems[ z ].id ].title = data ;
          sg.init();
        }
      }( idx ) ) );
    } );
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
        return elem.split( delim )[ 0 ];  
      } );
      var yVals = pairs.map( function( elem ) {
        return elem.split( delim )[ 1 ];  
      } );

      plot.xMin = Math.min.apply( Math, xVals );
      plot.xMax = Math.max.apply( Math, xVals );
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
        pt.x = elem - axes.xMin;
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
    
    graphPane.appendChild( graphic );

    drawAxes();
    tickXaxis();
    tickYaxis();
    var titleStr = '';
    for( var i = 0; i < plots.length; i ++ ) {
      var spectraStr = plots[ i ].spectrum.map( function ( elem ) {
        var pt = new Point( elem.x, elem.y );
        return pt.x + ',' + pt.y;
      } );
      var graph = document.createElementNS( svgNS, 'polyline' );
      graph.setAttributeNS( null, 'style', 'fill: none; stroke: black; stroke-width: 1;');
      graph.setAttributeNS( null, 'points', spectraStr.join( ' ' ) );
      document.getElementById( 'svgGraph' ).appendChild( graph );
      if( titleStr != '' ) titleStr += ', ';
      titleStr += plots[ i ].title ? plots[ i ].title : plots[ i ].fileName;
    }
    var title = document.createElementNS( svgNS, 'text' );
    title.setAttributeNS( null, 'x', ( graphWidth / 2 ) + ( yAxisMargin / 2 ) );
    title.setAttributeNS( null, 'y', 10 + ( fontSize * 1.5 ) / 2 );
    title.setAttributeNS( null, 'font-size', fontSize * 1.5 );
    title.setAttributeNS( null, 'style', 'text-anchor: middle;' );
    title.appendChild( document.createTextNode( titleStr ) );
    document.getElementById( 'svgGraph' ).appendChild( title );

    addStrip();
  }

  var addStrip = function() {
    var origin = new Point( 0, 0 );
    filmStrips.forEach( function( data, idx ) {
      var dataObj = icddData[ data ];
      var labelText = dataObj.title ? dataObj.title : dataObj.pdf_data[ labelChoice ];

      var label = document.createElementNS( svgNS, 'text' );
      label.setAttributeNS( null, 'x', origin.x + 10 );
      label.setAttributeNS( null, 'y', origin.y + filmStripSize * ( idx + 0.5 ) );
      label.setAttributeNS( null, 'width', fontSize * labelText.length );
      label.setAttributeNS( null, 'height', fontSize );
      label.setAttributeNS( null, 'font-family', typeFace );
      label.setAttributeNS( null, 'font-size', 0.9 * fontSize );
      label.setAttributeNS( null, 'dominant-baseline', 'middle' );
      if( autoSub ) {
        labelText = labelText.replace( /(\d+)\s?/g, function( labelText, match1 ) {
          switch ( match1 ) {
            case '0': return '\u2080';
            case '1': return '\u2081';
            case '2': return '\u2082';
            case '3': return '\u2083';
            case '4': return '\u2084';
            case '5': return '\u2085';
            case '6': return '\u2086';
            case '7': return '\u2087';
            case '8': return '\u2088';
            case '9': return '\u2089';
          }
        } );
      }

      label.appendChild( document.createTextNode( labelText ) );
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
    xMajor = parseInt( xMajorInput.value );
    xMinor = parseInt( xMinorInput.value );
    var firstTick = xMinor * Math.ceil( axes.xMin / xMinor );
    var shiftTick = firstTick - axes.xMin;
    var lastTick = xMinor * Math.floor( axes.xMax / xMinor );
    for( var i = firstTick; i <= lastTick; i += xMinor ) {
      var xTick = ( ( i - firstTick + shiftTick ) * axes.scaleX ) + yAxisMargin;
      var yTick = graphHeight - xAxisMargin;
      var tickSize = ( Math.round( i / xMajor ) === i / xMajor ) ? 10 : 5;
      var tick = makeLine( xTick, yTick, xTick, yTick + tickSize );
      svgGraph.appendChild( tick );

      if( tickSize === 10 ) {
        var label = document.createElementNS( svgNS, 'text' );
        label.setAttributeNS( null, 'x', xTick );
        label.setAttributeNS( null, 'y', yTick + tickSize + fontSize );
        label.setAttributeNS( null, 'fill', 'black' );
        label.setAttributeNS( null, 'font-family', typeFace );
        label.setAttributeNS( null, 'font-size', fontSize + 'px' );
        label.setAttributeNS( null, 'style', 'text-anchor: middle;' );
        label.appendChild( document.createTextNode( i ) );
        svgGraph.appendChild( label );
      }
    }
  };

  var tickYaxis = function() {
    yMajor = parseInt( yMajorInput.value );
    yMinor = parseInt( yMinorInput.value );
    var erase = svgGraph.querySelectorAll( '.yAxisMark' );
    for( var i = 0; i < erase.length; i++ ) {
      erase[ i ].parentNode.removeChild( erase[ i ] );
    }

    for( var i = 0; i < axes.yMax; i += yMinor ) {
      var xTick = yAxisMargin;
      var yTick = graphHeight - ( ( i * axes.scaleY ) + xAxisMargin + ( filmStrips.length * filmStripSize ) );
      var tickSize = ( Math.round( i / yMajor ) === i / yMajor ) ? 10 : 5;
      var tick = makeLine( xTick, yTick, xTick - tickSize, yTick );
      svgGraph.appendChild( tick );

      /*
      if( tickSize === 10 ) {
        var label = document.createElementNS( svgNS, 'text' );
        label.setAttributeNS( null, 'x', xTick - 20 );
        label.setAttributeNS( null, 'y', yTick );
        label.setAttributeNS( null, 'fill', 'black' );
        label.setAttributeNS( null, 'font-family', typeFace );
        label.setAttributeNS( null, 'font-size', fontSize + 'px' );
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
    xLabel.setAttributeNS( null, 'y', graphHeight - fontSize * 1.1 );
    xLabel.setAttributeNS( null, 'font-family', typeFace );
    xLabel.setAttributeNS( null, 'font-size', fontSize * 1.2 );
    xLabel.setAttributeNS( null, 'style', 'text-anchor: middle;' );
    xLabel.appendChild( document.createTextNode( '2\u03B8 [\u00B0]' ) );
    svgGraph.appendChild( xLabel );

    var yLabel = document.createElementNS( svgNS, 'text' );
    yLabel.setAttributeNS( null, 'x', fontSize * 1.2 );
    yLabel.setAttributeNS( null, 'y', topMargin + ( graphHeight - ( xAxisMargin + topMargin ) ) / 2 );
    yLabel.setAttributeNS( null, 'font-family', typeFace );
    yLabel.setAttributeNS( null, 'font-size', fontSize * 1.1 );
    yLabel.setAttributeNS( null, 'style', 'dominant-baseline: middle; text-anchor: middle;' );
    var transformStr = 'rotate( -90 ' + fontSize * 1.2 + ',' + ( topMargin + ( graphHeight - ( xAxisMargin + topMargin ) ) / 2 ) + ')';
    yLabel.setAttributeNS( null, 'transform',  transformStr );
    yLabel.appendChild( document.createTextNode( 'Intensity [arb.]' ) );
    svgGraph.appendChild( yLabel );
  };

  var makeLine = function( x1, y1, x2, y2 ) {
    var line = document.createElementNS( svgNS, 'line' );
    line.setAttributeNS( null, 'x1', x1 );
    line.setAttributeNS( null, 'y1', y1 );
    line.setAttributeNS( null, 'x2', x2 );
    line.setAttributeNS( null, 'y2', y2 );
    line.setAttributeNS( null, 'style', 'fill: none; stroke: black; stroke-width: 1;');
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
      sg.init();
    }
  }

  var handleFiles = function( files ) {
    var loadCounter = 0
    for( var i = 0; i < files.length; i++ ) {
      var fReader = new FileReader();
      fReader.onload = ( function( theFile ) {
        return function( e ) {
          var data = e.target.result.trim();
          if( /^\<\?xml/.test( data ) ) {
            var jsonData = alchemy.x2j.convert( data );
            icddData[ jsonData.pdfcard.pdf_data.pdf_number ] = jsonData.pdfcard;
            filmStrips.push( jsonData.pdfcard.pdf_data.pdf_number );
          } else if( /^[\d+(\.\d?)?\t\d+(\.\d?)?\s?\n]{3,}/.test( data ) 
              || /^[\d+(\.\d?)?\,\d+(\.\d?)?\s?\n]{3,}/.test( data ) ) {
            //if( plots.length === 0 ) {
              data = data.replace( '\r\n', '\n' );
              data = data.replace( '\r', '\n' );
              while( data.indexOf( '\n\n' ) != -1 ) {
                data = data.replace( '\n\n', '\n' );
              }
              dataFiles[ e.target.file.name ] = data;
            //}  else {
            //  msgOut( 'The free version can only plot one dataset per graph' );
            //}     
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
    resizeEnd = setTimeout( sg.init, 200 );
  }, false );

  return sg;
}( alchemy.sg = alchemy.sg || {} ) );

alchemy.sg.init();


