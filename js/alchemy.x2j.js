/* xml2json
 * tommangan.us
 * part of the alchemy toolbox
 */

var alchemy = alchemy || {};

alchemy.x2j = ( function( x2j ) {
  var jsonObj = {};
  var actualType = function( obj ) {
    return Object.prototype.toString.call( obj ).match( /\s([a-zA-Z]+)/ )[ 1 ].toLowerCase();
  }

  x2j.convert = function( xml ) {
    if( !xml ) return {};
    if( typeof( xml ) === 'string' ) {
      xml = new DOMParser().parseFromString( xml, 'text/xml' );
    }
    var root = xml.documentElement;
    jsonObj[ root.nodeName ] = {};
    dive( root, null, jsonObj[ root.nodeName ] );
    return jsonObj;  
  };

  var dive = function( parNode, grandParent, parentObj ) {
    var children = parNode.childNodes;

    for( var i = 0; i < children.length; i ++ ) {
      var thisNode = children[ i ];
      var thisName = thisNode.nodeName;
      if( thisNode.nodeType === 1 ) {     // is element node
        var thisType = actualType( parentObj[ thisName ] );
        var attr = {};
        for( var j = 0; j < thisNode.attributes.length; j++ ) {
          attr[ thisNode.attributes[ j ].name ] = thisNode.attributes[ j ].value;
        }
        if( thisType === 'undefined' ) {
          parentObj[ thisName ] = attr;
          dive( thisNode, parentObj, parentObj[ thisName ] );
        } else if( thisType === 'object' || thisType === 'string' ) {
          var temp = parentObj[ thisName ];
          parentObj[ thisName ] = [];
          parentObj[ thisName ].push( temp );
          parentObj[ thisName ].push( attr );
          dive( thisNode, parentObj[ thisName ], parentObj[ thisName ][ 1 ] );
        } else if( thisType === 'array' ) {
          parentObj[ thisName ].push( attr );      
          var len = parentObj[ thisName ].length;    
          dive( thisNode, parentObj[ thisName ], parentObj[ thisName ][ len - 1 ] );
        }
      } else if( thisNode.nodeType === 3  && thisNode.data.trim() != '' ) {
        if( actualType( grandParent ) === 'array' ) {
          if( Object.keys( parentObj ).length === 0 ) {
             grandParent[ grandParent.length - 1 ] = thisNode.data.trim();
          } else {
            parentObj[ 'text' ] = thisNode.data.trim();
          }
        } else if( Object.keys( parentObj ).length === 0 ) {
          grandParent[ parNode.nodeName ] = thisNode.data.trim();
        } else {
          parentObj[ 'text' ] = thisNode.data.trim();
        }
      }
    }
  };

  return x2j;
}( alchemy.x2j = alchemy.x2j || {} ) );


