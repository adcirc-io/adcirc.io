// import { dispatcher } from '../../../../adcirc-events/index'
import { dispatcher } from '../../../adcirc-events/index'

function dataset ( gl ) {

    var _mesh = adcirc.mesh();
    var _geometry;
    var _view;

    var _dataset = dispatcher();

    var _timeseries;

    _dataset.load_fort_14 = function ( file ) {

        var f14 = adcirc.fort14()
            .on( 'nodes', function ( event ) {
                _mesh.nodes( event.nodes );
            })
            .on( 'elements', function ( event ) {
                _mesh.elements( event.elements );
            })
            .on( 'ready', function () {

                _geometry = adcirc
                    .geometry( gl, _mesh );

                var _bounds = _mesh.bounds( 'depth' );

                var _shader = adcirc
                    .gradient_shader( gl, 4, _bounds[1], _bounds[0] );

                _view = adcirc
                    .view( gl, _geometry, _shader )
                    .nodal_value( 'depth' );

                _dataset.dispatch({
                    type: 'has_view',
                    view: _view
                });

            })
            .read( file );

        return _dataset;

    };

    _dataset.load_fort_63 = function ( file ) {

        var f63 = adcirc.fort63_cached( 20 )
            .on( 'progress', _dataset.dispatch )
            .on( 'timestep', function ( event ) {

                _mesh.nodal_value( 'elevation', event.timestep.data() );

            } )
            .open( file );

    };

    _dataset.load_residuals = function ( file ) {

        var residuals = adcirc.fort63_cached( 20 )
            .on( 'start', console.log )
            .on( 'finish', console.log )
            .on( 'timestep', console.log )
            .on( 'finish', function () {

                _timeseries = residuals;

            })
            .on( 'timestep', function ( event ) {

                console.log( event.timestep.index() );
                _mesh.elemental_value( 'residuals', event.timestep.data() );

            })
            .on( 'progress', _dataset.dispatch )
            .open( file );

    };

    _dataset.mesh = function () {
        return _mesh;
    };

    _dataset.next_timestep = function () {

        if ( _timeseries ) _timeseries.next_timestep();

    };

    _dataset.previous_timestep = function () {

        if ( _timeseries ) _timeseries.previous_timestep()

    };


    _dataset.view = function ( value ) {

        if ( _mesh.nodal_value( value ) ) {

            _view.nodal_value( value );

        } else if ( _mesh.elemental_value( value ) ) {

            _view.elemental_value( value );

        }

        return _view;

    };

    return _dataset;

}

export { dataset }