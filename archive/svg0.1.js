var init = function() {
  var graphPane = document.getElementById( 'graphPane' );
  var svgGraph = document.getElementById( 'svgGraph' );
  var graphWidth = graphPane.offsetWidth,
      graphHeight = graphPane.offsetHeight;

  var plotWidth = graphWidth - yAxisMargin,
      plotHeight = graphHeight - xAxisMargin;

  var rawPts = pts.split( ' ' );

  var xVals = rawPts.map( function( elem ) {
    return elem.split( ',' )[ 0 ];  
  } );
  var yVals = rawPts.map( function( elem ) {
    return elem.split( ',' )[ 1 ];  
  } );
  
  var xMin = Math.min.apply( Math, xVals ),
      xMax = Math.max.apply( Math, xVals ),
      yMin = Math.min.apply( Math, yVals ),
      yMax = Math.max.apply( Math, yVals );
  var xRange = xMax - xMin,
      yRange = yMax - yMin;
  var scaleX = plotWidth / xRange,
      scaleY = plotHeight / yRange;
  var xAxisMin = xMin * scaleX,
      xAxisMax = xMax * scaleX,
      yAxisMin = yMin * scaleY,
      yAxisMax = yMax * scaleY;    

  var Point = function( x, y ) {
    this.x = yAxisMargin + Math.round( x * scaleX );
    this.y = graphHeight - xAxisMargin - Math.round( y * scaleY );
  }

  
  // go ahead and make an array of spectra so you can add more later
  var spectra = [];
  spectra[ 0 ] = rawPts.map( function( elem ) {
    var vals = elem.split( ',' );
    var x = vals[ 0 ] - xMin;
    var y = vals[ 1 ];
    return new Point( x, y );
  } );

  var graphOrigin = new Point( xMin, yMin );

  var xAxis = document.getElementById( 'xAxis' );
  var yAxis = document.getElementById( 'yAxis' );
  var graph = document.getElementById( 'graph' );

  xAxis.setAttribute( 'x1', yAxisMargin );
  xAxis.setAttribute( 'y1', graphHeight - xAxisMargin );
  xAxis.setAttribute( 'x2', graphWidth );
  xAxis.setAttribute( 'y2', graphHeight - xAxisMargin );
  yAxis.setAttribute( 'x1', yAxisMargin );
  yAxis.setAttribute( 'y1', graphHeight - xAxisMargin );
  yAxis.setAttribute( 'x2', yAxisMargin );
  yAxis.setAttribute( 'y2', 0 );

  var spectraStr = spectra[ 0 ].map( function (elem ) {
    return elem.x + ',' + elem.y;
  } );
  graph.setAttribute( 'points', spectraStr.join( ' ' ) );

  // x Major ticks
  for( var i = 0; i <= xRange/xMajor; i++ ) {
    var xTick = Math.round( xMajor * i * scaleX ) + yAxisMargin;
    var yTick = graphHeight - xAxisMargin;
    var tick = document.createElementNS( svgNS, 'line' );
    tick.setAttributeNS( null, 'x1', xTick );
    tick.setAttributeNS( null, 'y1', yTick );
    tick.setAttributeNS( null, 'x2', xTick );
    tick.setAttributeNS( null, 'y2', yTick + 10 );
    tick.setAttributeNS( null, 'style', 'fill: none; stroke: black; stroke-width: 1;')

    var label = document.createElementNS( svgNS, 'text' );
    label.setAttributeNS( null, 'x', xTick );
    label.setAttributeNS( null, 'y', yTick + ( fontSize * 2 ) );
    label.setAttributeNS( null, 'fill', 'black' );
    label.setAttributeNS( null, 'font-family', 'Times New Roman' );
    label.setAttributeNS( null, 'font-size', fontSize + 'px' );
    label.setAttributeNS( null, 'style', 'text-anchor: middle;' );
    label.appendChild( document.createTextNode( xMin + xMajor * i ) );
    svgGraph.appendChild( tick );
    svgGraph.appendChild( label );
  }

  // x Minor ticks
  for( var i = 0; i < xRange/xMinor; i++ ) {
    var xTick = Math.round( xMinor * i * scaleX ) + yAxisMargin;
    var yTick = graphHeight - xAxisMargin;
    var tick = document.createElementNS( svgNS, 'line' );
    tick.setAttributeNS( null, 'x1', xTick );
    tick.setAttributeNS( null, 'y1', yTick );
    tick.setAttributeNS( null, 'x2', xTick );
    tick.setAttributeNS( null, 'y2', yTick + 5 );
    tick.setAttributeNS( null, 'style', 'fill: none; stroke: black; stroke-width: 1;')
    svgGraph.appendChild( tick );
  }

  // y Major ticks
  for( var i = 0; i <= yRange/yMajor; i++ ) {
    var xTick = yAxisMargin;
    var yTick = graphHeight - ( Math.round( yMajor * i * scaleY ) + xAxisMargin );
    var tick = document.createElementNS( svgNS, 'line' );
    tick.setAttributeNS( null, 'x1', xTick );
    tick.setAttributeNS( null, 'y1', yTick );
    tick.setAttributeNS( null, 'x2', xTick - 10 );
    tick.setAttributeNS( null, 'y2', yTick );
    tick.setAttributeNS( null, 'style', 'fill: none; stroke: black; stroke-width: 1;')

    var label = document.createElementNS( svgNS, 'text' );
    label.setAttributeNS( null, 'x', xTick - 20 );
    label.setAttributeNS( null, 'y', yTick );
    label.setAttributeNS( null, 'fill', 'black' );
    label.setAttributeNS( null, 'style', 'dominant-baseline: middle; text-anchor: end;' );
    label.appendChild( document.createTextNode( yMajor * i ) );
    svgGraph.appendChild( tick );
    svgGraph.appendChild( label );
  }

  // y Minor ticks
  for( var i = 0; i < yRange/yMinor; i++ ) {
    var xTick = yAxisMargin;
    var yTick = graphHeight - ( Math.round( yMinor * i * scaleY ) + xAxisMargin );
    var tick = document.createElementNS( svgNS, 'line' );
    tick.setAttributeNS( null, 'x1', xTick );
    tick.setAttributeNS( null, 'y1', yTick );
    tick.setAttributeNS( null, 'x2', xTick - 5 );
    tick.setAttributeNS( null, 'y2', yTick );
    tick.setAttributeNS( null, 'style', 'fill: none; stroke: black; stroke-width: 1;')
    svgGraph.appendChild( tick );
  }

  var xLabel = document.getElementById( 'xLabel' );
  xLabel.setAttributeNS( null, 'x', ( graphWidth / 2 ) + ( yAxisMargin / 2 ) );
  xLabel.setAttributeNS( null, 'y', graphHeight - ( xAxisMargin / 4 ) );
  xLabel.setAttributeNS( null, 'font-size', fontSize * 1.5 );
  xLabel.setAttributeNS( null, 'style', 'text-anchor: middle;' );
  var yLabel = document.getElementById( 'yLabel' );
  yLabel.setAttributeNS( null, 'x', yAxisMargin / 4 );
  yLabel.setAttributeNS( null, 'y', ( ( graphHeight - xAxisMargin ) / 2 ) );
  yLabel.setAttributeNS( null, 'font-size', fontSize * 1.5 );
  yLabel.setAttributeNS( null, 'style', 'dominant-baseline: middle; text-anchor: middle;' );
  var transformStr = 'rotate( -90 ' + yAxisMargin / 4 + ',' + ( ( graphHeight - xAxisMargin ) / 2 ) + ')';
  yLabel.setAttributeNS( null, 'transform',  transformStr );
}

document.addEventListener("DOMContentLoaded", init, false );

