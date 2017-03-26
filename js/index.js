var canvas = d3.select( '#canvas' );
var renderer = adcirc.gl_renderer( canvas )
    .clear_color( d3.color( 'darkgray' ) );

var ui = adcirc.ui( d3.select( 'body' ) );
var nodal_values = d3.select( '#nodal_values' );
var elemental_values = d3.select( '#elemental_values' );
var mesh = adcirc.mesh();

mesh.on( 'nodal_value', function ( event ) {

    nodal_values.append( 'option' )
        .attr( 'value', event.name )
        .text( event.name );

} );

mesh.on( 'elemental_value', function ( event ) {

    elemental_values.append( 'option' )
        .attr( 'value', event.name )
        .text( event.name );

} );

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

ui.residuals.file_picker( function ( file ) {

    var residuals = adcirc.fort63()
        .on( 'ready', function () {

            residuals.timestep( 0, function ( event ) {

                mesh.elemental_value( 'residuals', event.timestep.data() );

            });
        })
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

    mesh.on( 'elemental_value', function( event ) {

        var bounds = mesh.bounds( event.name );
        shader = adcirc
            .gradient_shader( renderer.gl_context(), 4, bounds[0], bounds[1] );
        view.elemental_value( event.name )
            .shader( shader );

    });

    view.nodal_value( 'depth' );

    renderer
        .add_view( view )
        .zoom_to( mesh, 500 );

}