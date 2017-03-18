var canvas = d3.select( '#canvas' );
var renderer = adcirc.gl_renderer()
    .clear_color( d3.color( 'white' ) )( canvas.node() );