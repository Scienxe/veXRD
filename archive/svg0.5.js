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
  var semiLogPlotBox = document.getElementById( 'semiLogPlotBox' );

  var prefs = {};
  prefs.fontSize = 30;
  prefs.strokeColor = [ 'black', 'blue', 'red', 'purple', 'green' ];
  prefs.strokeWidth = 1;
  prefs.manualMin = null;
  prefs.manualMax = null;
  var graphWidth, graphHeight, plotWidth, plotHeight;
  var scaleX, scaleY, xAxisMin, xAxisMax, yAxisMax;
  var dataFiles = {};
  var icddData = {};
  var axes = {};
  var plots = [];
  var filmStrips = [];
  var projectTitle;
  var graphTitle = 'Graph Title';

  var typeFace = '"Open Sans", Helvetica, sans-serif',
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
    prefs.semiLogPlot = semiLogPlotBox.checked ? true : false;
    prefs.semiLogStrip = semiLogStripBox.checked ? true : false;
    topMargin = 2 * prefs.fontSize;
    rightMargin = 0.5 * prefs.fontSize;
    xAxisMargin = 3 * prefs.fontSize;
    yAxisMargin = 2 * prefs.fontSize;
    filmStripSize = 1.5 * prefs.fontSize;
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
      //storeObj.prefs = prefs;
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
    var projSelect = document.getElementById( 'projectSelect' );           console.log( localStorage.length );
    for( var i = 0; i < localStorage.length; i++ ) {
      var option = document.createElement( 'option' );
      option.value = localStorage.key( i );
      option.innerText = localStorage.key( i );
      projSelect.add( option ); 
    }
    projSelect.addEventListener( 'change', function() {
      var projObj = localStorage[ projSelect.value ];
      prefs = projObj.prefs;
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

      var up = document.createElement( 'span' );
      up.className = 'upDown';
      if( idx === plots.length - 1 ) {
        up.style.opacity = 0;
      } else {
        up.title = 'Move Up';
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

      var left = document.createElement( 'span' );
      left.className = 'leftRight';
      left.title = 'Shift Left';
      left.addEventListener( 'click', ( function( z, e ) {
        return function() {
          plots[ z ].offset--;
          redraw();
        };
      }( idx ) ) );
      left.innerHTML = '&#9664;';

      var right = document.createElement( 'span' );
      right.className = 'leftRight';
      right.title = 'Shift Right';
      right.addEventListener( 'click', ( function( z, e ) {
        return function() {
          plots[ z ].offset++;
          redraw();
        };
      }( idx ) ) );
      right.innerHTML = '&#9654;';

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

      item.appendChild( up );
      item.appendChild( down );
      item.appendChild( left );
      item.appendChild( right );
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


      titleText = titleText.replace( /\s/g, '');
      titleText = titleText.replace( /(\d?\.?\d)\s?/g, function( titleText, match ) {
        return '<sub>' + match + '</sub>';
      } );

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
      kill.innerHTML = '&#x2715;';

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

      plot.xVals = pairs.map( function( elem ) {
        return parseFloat( elem.split( delim )[ 0 ].trim() );  
      } );
      plot.yVals = pairs.map( function( elem ) {
        return parseInt( elem.split( delim )[ 1 ].trim() );  
      } );
      plot.offset = 0;

      plot.xMin = Math.min.apply( Math, plot.xVals );
      plot.xMax = Math.max.apply( Math, plot.xVals );
      plot.yMax = Math.max.apply( Math, plot.yVals );

      plot.fileName = key;
      plot.title = key;

      plots.push( plot );
    } );
  };

  var setAxisBounds = function() {
    var xMins = [];
    var xMaxes = [];
    var yMaxes = [];
    for( var i = 0; i < plots.length; i++ ) {
      xMins.push( plots[ i ].xMin );
      xMaxes.push( plots[ i ].xMax );
      yMaxes.push( plots[ i ].yMax );
    }
    axes.xMin = Math.min.apply( Math, xMins );
    axes.xMax = Math.max.apply( Math, xMaxes );
    
    if( prefs.semiLogPlot ) {
      axes.yMax = Math.log( Math.max.apply( Math, yMaxes ) ) / Math.log( 10 );
    } else {
      axes.yMax = Math.max.apply( Math, yMaxes );
    }
    axes.scaleX = plotWidth / ( axes.xMax - axes.xMin );
    axes.scaleY = ( plotHeight - ( filmStrips.length * filmStripSize ) - ( ( plots.length - 1 ) * filmStripSize ) ) / axes.yMax;
  }

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

    for( var i = 0; i < plots.length; i++ ) {
      var plot = plots[ i ];
      var stepSize = plot.xVals[ 1 ] - plot.xVals[ 0 ];
      plot.offsetxVals = plot.xVals.slice();

      if( plot.offset < 0 ) {
        for( j = plot.offset; j < 0; j++ ) {
          plot.offsetxVals.unshift( plot.offsetxVals[ 0 ] - stepSize );
          plot.offsetxVals.pop();
        }
      } else if( plot.offset > 0 ) {
        for( j = 0; j < plot.offset; j++ ) {
          plot.offsetxVals.push( plot.offsetxVals[ plot.offsetxVals.length - 1 ] + stepSize );
          plot.offsetxVals.shift();
        }
      }
      plot.xMin = prefs.manualMin ? prefs.manualMin : plot.offsetxVals[ 0 ];
      plot.xMax = prefs.manualMax ? prefs.manualMax : plot.offsetxVals[ plot.offsetxVals.length - 1 ];
      setAxisBounds();
    }
    
    for( var i = 0; i < plots.length; i++ ) {
      var plot = plots[ i ];
      var yMin = Math.min.apply( Math, plot.yVals );
      if( prefs.semiLogPlot ) {
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
          return pt.x + ',' + ( pt.y - ( filmStripSize * i ) );
        }
      } );

      var graph = document.createElementNS( svgNS, 'polyline' );
      graph.setAttributeNS( null, 'style', 'fill: none; stroke: ' + prefs.strokeColor[ i ] + '; stroke-width: ' + prefs.strokeWidth + ';' );
      graph.setAttributeNS( null, 'points', spectraStr.join( ' ' ) );
      document.getElementById( 'svgGraph' ).appendChild( graph );
      
      var plotTitle = document.createElementNS( svgNS, 'text' );
      plotTitle.setAttribute( 'x',  plotWidth + yAxisMargin - 10 );
      plotTitle.setAttribute( 'y', topMargin + 10 + ( ( plots.length - 1 ) * filmStripSize * 0.8 ) - ( filmStripSize * i  * 0.8 ) );
      plotTitle.setAttribute( 'font-size', prefs.fontSize * 0.8 );
      plotTitle.setAttribute( 'style', 'text-anchor: end; stroke: none; fill: ' + prefs.strokeColor[ i ] + ';' );
      plotTitle.appendChild( document.createTextNode( plot.title ) );
      document.getElementById( 'svgGraph' ).appendChild( plotTitle );
    }

    drawAxes();
    tickXaxis();
    tickYaxis();

    var title = document.createElementNS( svgNS, 'text' );
    title.setAttributeNS( null, 'x', ( graphWidth / 2 ) + ( yAxisMargin / 2 ) );
    title.setAttributeNS( null, 'y', prefs.fontSize * 1.2 );
    //title.setAttributeNS( null, 'font-family', typeFace );
    title.setAttributeNS( null, 'font-size', prefs.fontSize * 1.3 );
    title.setAttributeNS( null, 'style', 'text-anchor: middle;' );
    title.appendChild( document.createTextNode( graphTitle ) );
    document.getElementById( 'svgGraph' ).appendChild( title );
    projectTitle = graphTitle;

    addStrip();
  }

  var addStrip = function() {
    var origin = new Point( 0, 0 );
    filmStrips.forEach( function( icddNum, idx ) {
      var dataObj = icddData[ icddNum ];
      var labelText = dataObj.title ? dataObj.title : dataObj.pdf_data[ labelChoice ];

      var label = document.createElementNS( svgNS, 'text' );
      label.setAttribute( 'font-size', 0.9 * prefs.fontSize );
      label.setAttribute( 'dominant-baseline', 'middle' );

      // Subscript all numbers in chemical formula
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

      label.setAttribute( 'x', origin.x + 10 );        
      label.setAttribute( 'y', origin.y + filmStripSize * ( idx + 0.7 ) );
      svgGraph.appendChild( label );


      var icddIdx = document.createElementNS( svgNS, 'text' );
      icddIdx.setAttribute( 'style', 'text-anchor: end;' );
      icddIdx.setAttribute( 'font-size', 0.5 * prefs.fontSize );
      icddIdx.setAttribute( 'dominant-baseline', 'middle' );
      icddIdx.appendChild( document.createTextNode( icddNum ) );
      icddIdx.setAttribute( 'x', plotWidth + yAxisMargin - 10 );
      icddIdx.setAttribute( 'y', origin.y + filmStripSize * ( idx + 0.3 ) );
      svgGraph.appendChild( icddIdx );


      var stripBorder = makeLine( origin.x, origin.y + idx * filmStripSize,
          origin.x + plotWidth, origin.y + idx * filmStripSize );
      svgGraph.appendChild( stripBorder );

      var strip = dataObj.graphs.stick_series.intensity.filter( function( elem ) {
        return ( isNaN( parseInt( elem.intensity ) ) ) ? false : true;
      } );
      var intensities = strip.map( function( peak ) {
        if( prefs.semiLogStrip ) {
          return Math.log( parseInt( peak.intensity ) ) / Math.log( 10 );
        } else {
          return parseInt( peak.intensity );
        }
      } );
      var strongest = Math.max.apply( Math, intensities );

      // var dataTable = '<table border=1 cellspacing=0><tr><td>2theta</td><td>h</td><td>k</td><td>l</td><td>I</td></tr>';
      strip.forEach( function( peak, stickIdx ) {
        if( peak.theta > axes.xMin && peak.theta < axes.xMax ) {
          // dataTable += '<tr><td>' + peak.theta + '</td><td>' + peak.h + '</td><td>' + peak.k + '</td><td>' + peak.l + '</td><td>' + peak.intensity + '</td></tr>';
          var pt = new Point( peak.theta - axes.xMin, 0 );
          var stick = makeLine ( pt.x,
            pt.y + filmStripSize * ( 1 + idx ),
            pt.x,
            pt.y + filmStripSize * ( 1 + idx ) - filmStripSize * intensities[ stickIdx ] / strongest
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
    xLabel.setAttributeNS( null, 'font-size', prefs.fontSize * 0.9 );
    xLabel.setAttributeNS( null, 'style', 'text-anchor: middle;' );
    xLabel.appendChild( document.createTextNode( '2\u03B8 [\u00B0]' ) );
    svgGraph.appendChild( xLabel );

    var yLabel = document.createElementNS( svgNS, 'text' );
    yLabel.setAttributeNS( null, 'x', prefs.fontSize  );
    yLabel.setAttributeNS( null, 'y', topMargin + ( graphHeight - ( filmStrips.length * filmStripSize + xAxisMargin + topMargin ) ) / 2 );
    yLabel.setAttributeNS( null, 'font-size', prefs.fontSize * 0.9 );
    yLabel.setAttributeNS( null, 'style', 'dominant-baseline: middle; text-anchor: middle;' );
    var transformStr = 'rotate( -90 ' + prefs.fontSize + ',' + ( topMargin + ( graphHeight - ( filmStrips.length * filmStripSize + xAxisMargin + topMargin ) ) / 2 ) + ')';
    yLabel.setAttributeNS( null, 'transform',  transformStr );
    var intensityUnit = plots.length > 1 ? 'normalized' : 'arbitrary';
    yLabel.appendChild( document.createTextNode( 'Intensity [' + intensityUnit + ']' ) );
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
    var elem = document.createElement( 'div' );
    elem.innerHTML = msg;
    messageDiv.appendChild( elem );
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
            filmStrips.unshift( jsonData.pdfcard.pdf_data.pdf_number );
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

  fontSizeIn.addEventListener( 'change', function() {
    fontSizeOut.value = fontSizeIn.value;
  } );
  fontSizeIn.addEventListener( 'mouseup', function() {
    redraw();
  } );
  semiLogPlotBox.addEventListener( 'change', function() {
    redraw();
  } );
  semiLogStripBox.addEventListener( 'change', function() {
    redraw();
  } );

  return sg;
}( alchemy.sg = alchemy.sg || {} ) );

alchemy.sg.init();


