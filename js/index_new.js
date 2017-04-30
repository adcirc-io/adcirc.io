import { dataset as Dataset } from './models/dataset_new'
import { mesh_properties_view as MeshProperties } from './views/mesh_properties_view'
import { mesh_data_view as MeshData } from './views/mesh_data_view'
import { display_view as DisplayView } from './views/display_view'
import { timeseries_view as TimeseriesView } from './views/timeseries_view'
import { plotting_tools_view as PlottingView } from './views/plotting_tools_view'

var canvas = d3.select( '#canvas' );
var renderer = adcirc.gl_renderer( canvas ).clear_color( d3.color( '#666666' ) );
var ui = adcirc.ui( d3.select( 'body' ) );
var sidebar = d3.select( '#sidebar' );

var data = Dataset( renderer );

var mesh_properties_section = sidebar.append( 'div' ).attr( 'class', 'item ' );
var mesh_data_section = sidebar.append( 'div' ).attr( 'class', 'item' );
var timeseries_section = sidebar.append( 'div' ).attr( 'class', 'item' );
var plotting_section = sidebar.append( 'div' ).attr( 'class', 'item' );
var display_options_section = sidebar.append( 'div' ).attr( 'class', 'item' );

var mesh_properties_initialized = false;
var mesh_data_initialized = false;
var timeseries_initialized = false;
var plotting_initialized = false;
var display_options_initialized = false;

var mesh_properties_view = MeshProperties();
var mesh_data_view = MeshData( data );
var timeseries_view = TimeseriesView( data );
var plotting_view = PlottingView( data );
var display_options_view = DisplayView( data );

connect_dataset( data );
ui.fort14.file_picker( initialize );


function connect_dataset ( dataset ) {

    dataset
        .on( 'render', renderer.render )
        .on( 'view', on_view )
        .on( 'timestep', on_timestep );

    dataset
        .on( 'finish', function ( event ) {

            switch ( event.task ) {

                case 'timeseries_prep':

                    if ( !plotting_initialized ) {
                        plotting_view( plotting_section );
                        plotting_initialized = true;
                    }

                    break;

            }

        });

}

function initialize ( file ) {

    d3.select( '#opening-message' ).remove();
    d3.select( '#fort14-item' ).remove();

    var progress_bar = sidebar.append( 'div' ).attr( 'class', 'item' );
    var progress = adcirc.progress()( progress_bar.append( 'div' ) );

    data
        .on( 'progress', update_progress )
        .on( 'mesh_loaded', on_mesh_loaded );

    data.mesh().on( 'bounding_box', function () {

        renderer.zoom_to( data.mesh(), 200 );

    });

    data.load_fort_14( file );

    function on_mesh_loaded () {

        progress_bar.remove();

        display();

        data.off( 'progress', update_progress )
            .off( 'mesh_loaded', on_mesh_loaded )
            .view( 'depth' );

    }

    function update_progress ( event ) {

        if ( event.task === 'load_mesh' ) {

            progress.progress( event.progress );

        }

    }

}

function display () {

    if ( !mesh_properties_initialized ) {

        mesh_properties_view.num_nodes( data.mesh().num_nodes() );
        mesh_properties_view.num_elements( data.mesh().num_elements() );

        mesh_properties_view( mesh_properties_section );
        mesh_properties_initialized = true;

    }

    if ( !mesh_data_initialized ) {

        mesh_data_view( mesh_data_section );
        mesh_data_initialized = true;

    }

    if ( !timeseries_initialized ) {

        timeseries_view( timeseries_section );
        timeseries_initialized = true;

    }

    if ( !display_options_initialized ) {

        display_options_view( display_options_section );
        display_options_initialized = true;

    }

}

function on_timestep ( event ) {

}

function on_view ( event ) {

    renderer.set_view( event.view );

}