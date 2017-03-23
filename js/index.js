var canvas = d3.select( '#canvas' );
var renderer = adcirc.gl_renderer( canvas )
    .clear_color( d3.color( 'darkgray' ) );

var ui = adcirc.ui( d3.select( 'body' ) );
var mesh = adcirc.mesh();

ui.fort14.file_picker( function ( file ) {

    var f14 = adcirc.fort14()
        .on( 'nodes', function( event ) {
            mesh.nodes( event.nodes );
        })
        .on( 'elements', function ( event ) {
            mesh.elements( event.elements );
        })
        .on( 'ready', display_mesh )
        .read( file );

});

function display_mesh () {

    if ( !mesh.num_nodes() || !mesh.num_elements() ) {
        return;
    }

    var depth_range = mesh.bounds( 'depth' );

    var geometry = adcirc
        .geometry( renderer.gl_context(), mesh );

    var shader = adcirc
        .gradient_shader( renderer.gl_context(), 4, depth_range[1], depth_range[0] );

    var view = adcirc.view( renderer.gl_context(), geometry, shader );

    view.nodal_value( 'depth' );

    renderer
        .add_view( view )
        .zoom_to( mesh, 500 );

}