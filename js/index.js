import { dataset } from './models/dataset'
import { mesh_view } from './views/mesh_view'

// Build the UI
var canvas = d3.select( '#canvas' );
var renderer = adcirc
    .gl_renderer( canvas )
    .clear_color( d3.color( 'darkgray' ) );
var ui = adcirc
    .ui( d3.select( 'body' ) );
var elemental_values = d3.select( '#elemental_values' );
var nodal_values = d3.select( '#nodal_values' );
var num_nodes = d3.select( '#num-nodes' );
var num_elements = d3.select( '#num-elements' );
var bounding_box = d3.select( '#bounding-box' );

// Set up data views
var initialized = false;
var view_mesh = mesh_view()
    .elemental_values( elemental_values )
    .nodal_values( nodal_values )
    .num_nodes( num_nodes )
    .num_elements( num_elements )
    .bounding_box( bounding_box );

// There'll only be a single dataset to begin with
var data = dataset( renderer.gl_context() );
var mesh = data.mesh();

// Set up file pickers
ui.fort14.file_picker( data.load_fort_14 );
ui.fort63.file_picker( data.load_fort_63 );
ui.residuals.file_picker( data.load_residuals );

// Set up gradient slider
ui.colorbar.on( 'gradient', data.gradient );

// Connect the views to the data
view_mesh( data.mesh() );

// Respond to events from the mesh
mesh.on( 'bounding_box', function () {

    if ( !initialized ) {

        renderer.zoom_to( mesh, 200 );
        initialized = true;

    }

});

// Respond to events from the dataset
data.on( 'has_view', function ( event ) {

    renderer.add_view( event.view );

});

data.on( 'progress', function ( event ) {

    ui.progress.progress( event.progress );

});

data.on( 'gradient', function ( event ) {

    ui.colorbar.stops( event.values, event.colors );

});

data.on( 'render', renderer.render );

// Respond to events from views
view_mesh.on( 'nodal_value', function ( event ) {

    data.view( event.nodal_value );

});

view_mesh.on( 'elemental_value', function ( event ) {

    data.view( event.elemental_value );

});

// Repond to keyboard events
d3.select( 'body' ).on( 'keydown', function () {

    switch ( d3.event.key ) {

        case 'ArrowRight':
            data.next_timestep();
            break;

        case 'ArrowLeft':
            data.previous_timestep();
            break;

    }

});