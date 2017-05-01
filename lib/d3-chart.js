(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.d3 = global.d3 || {})));
}(this, function (exports) { 'use strict';

    function chart() {

        // ID
        var id = _gen_id();

        // Chart options
        var outer_width = 760;
        var outer_height = 500;
        var margin = { top: 20, right: 20, bottom: 20, left: 30 };
        var width, height;

        // x-axis
        var x = function ( d ) {
            return d[ 0 ];
        };
        var x_scale;    // Defaults to d3.scaleLinear()
        var x_axis;     // Defaults to d3.axisBottom()
        var x_location; // Defaults to 'bottom'
        var x_grid;     // Defaults to none
        var x_label;    // Defaults to none

        // y-axis
        var y = function ( d ) {
            return d[ 1 ];
        };
        var y_scale;    // Defaults to d3.scaleLinear()
        var y_axis;     // Defaults to d3.axisLeft()
        var y_location; // Defaults to 'left'
        var y_grid;     // Defaults to none
        var y_label;    // Defaults to none

        // Domain and range
        var domain;
        var range;

        // Plotting group
        var g;

        // Plottables
        var areas = [];
        var bars = [];
        var lines = [];
        var scatters = [];

        // Legends
        var legends = [];

        // Colors
        var _current_color = 0;
        var _colors = [ "#377eb8", "#e41a1c", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999" ];

        // Hover callbacks
        var hover_in, hover, hover_out;
        var last_mouse_x, last_mouse_y;


        // The charting function
        function _chart( selection ) {

            width = outer_width - margin.left - margin.right;
            height = outer_height - margin.top - margin.bottom;

            selection.each(function () {

                var svg = d3.select(this)
                    .selectAll('svg')
                    .data([ 'd3-chart' ]);

                // If it doesn't exist, create the chart group
                var enter = svg.enter()
                    .append('svg');
                g = enter.append('g');

                // Add the axes
                g.append('g')
                    .attr('class', 'x axis');
                g.append('g')
                    .attr('class', 'y axis');
                g.append('g')
                    .attr('class', 'x axis minor');
                g.append('g')
                    .attr('class', 'y axis minor');

                // Update the outer dimensions
                svg = enter.merge(svg)
                    .attr('width', outer_width)
                    .attr('height', outer_height);

                // Update the inner dimensions
                g = svg.select('g')
                    .attr('id', id )
                    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

                _build_scales();

                _build_axes( g );

                _update_group( g, 'areagroup', areas );
                _update_group( g, 'linegroup', lines );
                _update_group( g, 'scattergroup', scatters );

                _build_hover_area( g );

                _update_group( g, 'bargroup', bars );

                _build_labels( g );

                _update_legends( g );

            });

            return selection.selectAll('svg > g');

        }


        // Plotting functions
        _chart.area = function ( id ) {

            var _id = id || _gen_id();
            var _data = [];
            var _path;
            var _curve;
            var _x;
            var _y0;
            var _y1;
            var _x_extent, _y_extent;

            var _attributes = d3.map();
            var _styles = d3.map();
            _attributes.set( 'fill', _next_color() );

            var _hover_in, _hover, _hover_out;
            var _line;
            var _bisector = d3.bisector(function ( d ) {
                return _area.x()(d);
            }).right;

            function _area( group ) {

                _x = _area.x();
                _y0 = _area.y0();
                _y1 = _area.y1();

                var area = d3.area()
                    .x( function ( d ) { return x_scale(_x(d)); } )
                    .y0( function ( d ) { return y_scale(_y0(d)); } )
                    .y1( function ( d ) { return y_scale(_y1(d)); } );

                group.attr('id', _id);

                _path = group.selectAll('path')
                    .data( function ( d ) {
                        return [ d ];
                    });

                _line = group.selectAll('.hoverline')
                            .data([ 'hoverline' ]);

                _path = _path.enter()
                    .append('path')
                    .attr('class', 'area')
                    .merge(_path);

                _line = _line.enter()
                    .append('line')
                    .attr('class', 'hoverline')
                    .attr('shape-rendering', 'crispEdges')
                    .style('display', 'none')
                    .merge(_line);

                if ( _curve ) { area.curve(_curve); }

                _path.attr('d', function ( d ) {
                        return area(d.data());
                    });

                _attributes.each( function ( _value, _attr ) {
                    _path.attr(_attr, _value);
                });

                _styles.each( function ( _value, _style ) {
                    _path.style(_style, _value);
                });

            }

            _area.attr = function ( _ ) {
                if ( arguments.length === 1 ) return _attributes.get( _ );
                if ( arguments.length === 2 ) _attributes.set( arguments[0], arguments[1] );
                return _area;
            };

            _area.curve = function ( _ ) {
                if ( !arguments.length ) return _curve;
                _curve = _;
                return _area;
            };

            _area.data = function ( _ ) {
                if ( !arguments.length ) return _data;
                _data = _;
                _x_extent = null;
                _y_extent = null;
                return _area;
            };

            _area.hover = function ( _ ) {
                if ( !arguments.length ) return _hover;
                _hover = _;
                return _area;
            };

            _area.hover_in = function ( _ ) {
                if ( !arguments.length ) return _hover_in;
                _hover_in = _;
                return _area;
            };

            _area.hover_out = function ( _ ) {
                if ( !arguments.length ) return _hover_out;
                _hover_out = _;
                return _area;
            };

            _area.id = function ( _ ) {
                return _id;
            };

            _area.mouse_in = function () {

                _line.style('display', null)
                    .attr('stroke', d3.color(_styles.get('fill') || _attributes.get('fill')).darker());

                if ( typeof _hover_in === 'function' ) {
                    _hover_in.call(_line.node(), _path.nodes());
                }

            };

            _area.mouse_move = function ( x ) {

                var i = _nearest_index( _area, _bisector, x );
                var d = _data[i];

                if ( d ) {

                    _line.attr('x1', x_scale(_area.x()(d)))
                        .attr('x2', x_scale(_area.x()(d)))
                        .attr('y1', y_scale(_area.y0()(d)))
                        .attr('y2', y_scale(_area.y1()(d)));

                    if ( typeof _hover === 'function' ) {
                        _hover.call(_line.node(), d, 0, _path.nodes() );
                    }

                } else {

                    _area.mouse_out();

                }

            };

            _area.mouse_out = function () {
                _line.style('display', 'none');
                if ( typeof _hover_out === 'function' ) {
                    _hover_out.call( _line.node(), _path.nodes() );
                }
            };

            _area.remove = function () {

                var i = areas.indexOf(_area);
                if ( i != -1 ) {
                    areas.splice(i, 1);
                }

            };

            _area.style = function ( _ ) {
                if ( arguments.length === 1 ) return _styles.get( _ );
                if ( arguments.length === 2 ) _styles.set( arguments[0], arguments[1] );
                return _area;
            };

            _area.x = function ( _ ) {
                if ( !arguments.length ) return _x || x;
                _x = _;
                return _area;
            };

            _area.x_extent = function () {
                if ( !_x_extent ) _x_extent = d3.extent( _data, _area.x() );
                return _x_extent;
            };

            _area.y0 = function ( _ ) {
                if ( !arguments.length ) return _y0 || _constant( d3.min( _area.data(), _area.y1() ) );
                _y0 = typeof _ === 'function' ? _ : _constant(+_);
                return _area;
            };

            _area.y1 = function ( _ ) {
                if ( !arguments.length ) return _y1 || y;
                _y1 = typeof _ === 'function' ? _ : _constant(+_);
                return _area;
            };

            _area.y_extent = function () {
                if ( !_y_extent ) {
                    var _y0 = d3.extent( _data, _area.y0() );
                    var _y1 = d3.extent( _data, _area.y1() );
                    _y_extent = [ d3.min([_y0[0], _y0[1]]), d3.max([_y0[1], _y1[1]]) ];
                }
                return _y_extent;
            };

            areas.push( _area );
            return _area;

        };

        _chart.bar = function ( id ) {

            var _id = id || _gen_id();
            var _data = [];
            var _bars;
            var _x;
            var _y;

            var _hover;
            var _hover_in;
            var _hover_out;

            var _attributes = d3.map();
            var _styles = d3.map();
            _attributes.set( 'pointer-events', 'all' );
            _attributes.set( 'fill', _next_color() );
            _attributes.set( 'shape-rendering', 'crispEdges' );

            function _bar( group ) {

                _x = _bar.x();
                _y = _bar.y();

                group.attr('id', _id);

                _bars = group.selectAll('.bar')
                    .data( _data );

                _bars = _bars.enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .merge( _bars );

                _bars.on( 'mouseover touchstart', function ( d, i, nodes ) {
                    if ( _bar.hover_in() || _bar.hover() || _bar.hover_out() ) {
                        _bar.mouse_in.call( this, d, i, nodes );
                    }
                });

                _bars.on( 'mousemove touchmove', function ( d, i, nodes ) {
                    if ( _bar.hover_in() || _bar.hover() || _bar.hover_out() ) {
                        _bar.mouse_move.call( this, d, i, nodes );
                    }
                });

                _bars.on( 'mouseout touchend touchcancel', function (d, i, nodes) {
                    if ( _bar.hover_in() || _bar.hover() || _bar.hover_out() ) {
                        _bar.mouse_out.call( this, d, i, nodes );
                    }
                });

                _bars.attr('x', function ( d ) { return x_scale(_x(d)); })
                    .attr('y', function ( d ) { return y_scale(_y(d)); })
                    .attr('width', x_scale.bandwidth())
                    .attr('height', function ( d ) { return height - y_scale(_y(d)); });

                _attributes.each( function ( _value, _attr ) {
                    _bars.attr(_attr, _value);
                });

                _styles.each( function ( _value, _style ) {
                    _bars.style(_style, _value);
                });
            }

            _bar.attr = function ( _ ) {
                if ( arguments.length === 1 ) return _attributes.get( _ );
                if ( arguments.length === 2 ) _attributes.set( arguments[0], arguments[1] );
                return _bar;
            };

            _bar.data = function ( _ ) {
                if ( !arguments.length ) return _data;
                _data = _;
                return _bar;
            };

            _bar.hover = function ( _ ) {
                if ( !arguments.length ) return _hover;
                _hover = _;
                return _bar;
            };

            _bar.hover_in = function ( _ ) {
                if ( !arguments.length ) return _hover_in;
                _hover_in = _;
                return _bar;
            };

            _bar.hover_out = function ( _ ) {
                if ( !arguments.length ) return _hover_out;
                _hover_out = _;
                return _bar;
            };

            _bar.id = function () {
                return _id;
            };

            _bar.mouse_in = function ( d, i, nodes ) {
                var b = d3.select(nodes[i]);
                b.attr('fill', d3.color(_attributes.get('fill')).darker());
                if ( typeof _hover_in === 'function' ) {
                    _hover_in.call( this, d, i, nodes );
                }
            };

            _bar.mouse_move = function ( d, i, nodes ) {
                if ( typeof _hover === 'function' ) {
                    _hover.call( this, d, i, nodes );
                }
            };

            _bar.mouse_out = function ( d, i, nodes ) {
                var b = d3.select(nodes[i]);
                b.attr('fill', _attributes.get('fill'));
                if ( typeof _hover_out === 'function' ) {
                    _hover_out.call( this, d, i, nodes );
                }
            };

            _bar.style = function ( _ ) {
                if ( arguments.length === 1 ) return _styles.get( _ );
                if ( arguments.length === 2 ) _styles.set( arguments[0], arguments[1] );
                return _bar;
            };

            _bar.x = function ( _ ) {
                if ( !arguments.length ) return _x || x;
                _x = _;
                return _bar;
            };

            _bar.y = function ( _ ) {
                if ( !arguments.length ) return _y || y;
                _y = _;
                return _bar;
            };

            bars.push(_bar);
            return _bar;

        };

        _chart.line = function ( id ) {

            var _id = id || _gen_id();
            var _data = [];
            var _path;
            var _curve;
            var _x, _x_extent;
            var _y, _y_extent;

            var _attributes = d3.map();
            var _styles = d3.map();
            _attributes.set( 'stroke', _next_color() );
            _attributes.set( 'stroke-width', 1.0 );

            // Hover stuff
            var _dot;
            var _hover_in;
            var _hover;
            var _hover_out;
            var _bisector = d3.bisector(function ( d ) {
                return _line.x()(d);
            }).right;


            function _line( group ) {

                _x = _line.x();
                _y = _line.y();

                var line = d3.line()
                    .x( function ( d ) { return x_scale(_x(d)); } )
                    .y( function ( d ) { return y_scale(_y(d)); } )
                    .defined( function ( d ) {
                        return d[1] !== -99999;
                    });

                group.attr('id', _id);

                _path = group.selectAll('path')
                    .data(function ( d ) {
                        return [ d ];
                    });
                _dot = group.selectAll('.hoverdot')
                    .data([ 'hoverdot' ]);

                _path = _path.enter()
                    .append('path')
                    .attr('class', 'line')
                    .merge(_path);

                _dot = _dot.enter()
                    .append('circle')
                    .attr('class', 'hoverdot')
                    .attr('pointer-events', 'none')
                    .style('display', 'none')
                    .merge(_dot);

                if ( _curve ) { line.curve( _curve ); }

                _path.attr('fill', 'none')
                    .attr('d', function ( d ) {
                        return line(d.data());
                    });

                _attributes.each( function ( _value, _attr ) {
                    _path.attr(_attr, _value);
                });

                _styles.each( function ( _value, _style ) {
                    _path.style(_style, _value);
                })

            }

            _line.attr = function ( _ ) {
                if ( arguments.length === 1 ) return _attributes.get( _ );
                if ( arguments.length === 2 ) _attributes.set( arguments[0], arguments[1] );
                return _line;
            };

            _line.curve = function ( _ ) {
                if ( !arguments.length ) return _curve;
                _curve = _;
                return _line;
            };

            _line.data = function ( _ ) {
                if ( !arguments.length ) return _data;
                _data = _;
                _x_extent = null;
                _y_extent = null;
                return _line;
            };

            _line.hover = function ( _ ) {
                if ( !arguments.length ) return _hover;
                _hover = _;
                return _line;
            };

            _line.hover_in = function ( _ ) {
                if ( !arguments.length ) return _hover_in;
                _hover_in = _;
                return _line;
            };

            _line.hover_out = function ( _ ) {
                if ( !arguments.length ) return _hover_out;
                _hover_out = _;
                return _line;
            };

            _line.id = function () {
                return _id;
            };

            _line.mouse_in = function () {

                _dot.style('display', null);

                if ( typeof _hover_in === 'function' ) {
                    _hover_in.call(_dot.node(), _path.nodes());
                }

            };

            _line.mouse_move = function ( x ) {

                var i = _nearest_index( _line, _bisector, x );
                var d = _data[i];

                if ( d ) {

                    _dot.attr('cx', x_scale(_line.x()(d)))
                        .attr('cy', y_scale(_line.y()(d)))
                        .attr('r', 3)
                        .attr('fill', _path.style('stroke'));

                    if ( typeof _hover === 'function' ) {
                        _hover.call(_dot.node(), d, 0, _path.nodes() );
                    }

                } else {

                    _line.mouse_out();

                }

            };

            _line.mouse_out = function () {
                _dot.style('display', 'none');
                if ( typeof _hover_out === 'function' ) {
                    _hover_out.call( _dot.node(), _path.nodes() );
                }
            };

            _line.remove = function () {

                var i = lines.indexOf(_line);
                if ( i != -1 ) {
                    lines.splice(i, 1);
                }

            };

            _line.style = function ( _ ) {
                if ( arguments.length === 1 ) return _styles.get( _ );
                if ( arguments.length === 2 ) _styles.set( arguments[0], arguments[1] );
                return _line;
            };

            _line.x = function ( _ ) {
                if ( !arguments.length ) return _x || x;
                _x = _;
                return _line;
            };

            _line.x_extent = function () {
                if ( !_x_extent ) _x_extent = d3.extent( _data, _line.x() );
                return _x_extent;
            };

            _line.y = function ( _ ) {
                if ( !arguments.length ) return _y || y;
                _y = _;
                return _line;
            };

            _line.y_extent = function () {
                if ( !_y_extent ) _y_extent  = d3.extent( _data, _line.y() );
                return _y_extent;
            };

            lines.push(_line);
            return _line;

        };

        _chart.scatter = function ( id ) {

            var _id = id || _gen_id();
            var _data = [];
            var _dots;
            var _x, _x_extent;
            var _y, _y_extent;

            var _attributes = d3.map();
            var _styles = d3.map();
            _attributes.set('r', 1.0);
            _attributes.set('fill', _next_color());

            // Hover stuff
            var _dot;
            var _hover_in;
            var _hover;
            var _hover_out;
            var _bisector = d3.bisector(function ( d ) {
                return _scatter.x()(d);
            }).right;

            function _scatter( group ) {

                _x = _scatter.x();
                _y = _scatter.y();

                group.attr('id', _id);

                _dots = group.selectAll('.dot')
                    .data(function ( d ) {
                        return d.data();
                    });
                _dot = group.selectAll('.hoverdot')
                    .data([ 'hoverdot' ]);

                _dots = _dots.enter()
                    .append('circle')
                    .attr('class', 'dot')
                    .merge(_dots);

                _dot = _dot.enter()
                    .append('circle')
                    .attr('class', 'hoverdot')
                    .style('display', 'none')
                    .merge(_dot);

                _dots
                    .attr('cx', function ( d ) {
                        return x_scale(_x(d));
                    })
                    .attr('cy', function ( d ) {
                        return y_scale(_y(d));
                    });

                _attributes.each( function ( _value, _attr ) {
                    _dots.attr(_attr, _value);
                });

                _styles.each( function ( _value, _style ) {
                    _dots.style(_style, _value);
                })

            }

            _scatter.attr = function ( _ ) {
                if ( arguments.length === 1 ) return _attributes.get( _ );
                if ( arguments.length === 2 ) _attributes.set( arguments[0], arguments[1] );
                return _scatter;
            };

            _scatter.data = function ( _ ) {
                if ( !arguments.length ) return _data;
                _data = _;
                _x_extent = null;
                _y_extent = null;
                return _scatter;
            };

            _scatter.hover = function ( _ ) {
                if ( !arguments.length ) return _hover;
                _hover = _;
                return _scatter;
            };

            _scatter.hover_in = function ( _ ) {
                if ( !arguments.length ) return _hover_in;
                _hover_in = _;
                return _scatter;
            };

            _scatter.hover_out = function ( _ ) {
                if ( !arguments.length ) return _hover_out;
                _hover_out = _;
                return _scatter;
            };

            _scatter.id = function () {
                return _id;
            };

            _scatter.mouse_in = function () {
                _dot.style('display', null);
                if ( typeof _hover_in === 'function' ) {
                    _hover_in.call( _dot.node(), _dots.nodes() );
                }

            };

            _scatter.mouse_move = function ( x ) {

                var i = _nearest_index( _scatter, _bisector, x );
                var d = _data[i];

                if ( d ) {

                    var dot = d3.select(_dots.nodes()[i]);

                    _dot.attr('cx', x_scale(_scatter.x()(d)))
                        .attr('cy', y_scale(_scatter.y()(d)));

                    _dot.attr('r', +dot.attr('r') + 2);
                    _dot.attr('fill', dot.style('fill'));

                    if ( typeof _hover === 'function' ) {
                        _hover.call( _dot.node(), d, i, _dots.nodes() );
                    }

                } else {

                    _scatter.mouse_out();

                }

            };

            _scatter.mouse_out = function () {
                _dot.style('display', 'none');
                if ( typeof _hover_out === 'function' ) {
                    _hover_out.call( _dot.node(), _dots.nodes() );
                }
            };

            _scatter.remove = function () {

                var i = scatters.indexOf(_scatter);
                if ( i != -1 ) {
                    scatters.splice(i, 1);
                }

            };

            _scatter.style = function ( _ ) {
                if ( arguments.length === 1 ) return _styles.get( _ );
                if ( arguments.length === 2 ) _styles.set( arguments[0], arguments[1] );
                return _scatter;
            };

            _scatter.x = function ( _ ) {
                if ( !arguments.length ) return _x || x;
                _x = _;
                return _scatter;
            };

            _scatter.x_extent = function () {
                if ( !_x_extent ) _x_extent = d3.extent( _data, _scatter.x() );
                return _x_extent;
            };

            _scatter.y = function ( _ ) {
                if ( !arguments.length ) return _y || y;
                _y = _;
                return _scatter;
            };

            _scatter.y_extent = function () {
                if ( !_y_extent ) _y_extent = d3.extent( _data, _scatter.y() );
                return _y_extent;
            };

            scatters.push(_scatter);
            return _scatter;

        };


        // Legend
        _chart.legend = function ( id ) {

            var _id = id || _gen_id();
            var _items = [];
            var _container;
            var _location = 'ne';
            var _box_width = 20;
            var _box_height = 20;
            var _box_padding = 2;
            var _margin = {top: 0, right: 0, bottom: 10, left: 10};
            var _label_padding = 5;

            var _attributes = d3.map();
            var _styles = d3.map();
            _attributes.set('font-family', 'sans-serif');
            _attributes.set('font-size', 10);

            function _legend ( group ) {

                group.attr( 'id', _id )
                    .attr('text-anchor', ( _location === 'nw' || _location === 'sw' ) ? 'start' : 'end');

                _attributes.each( function ( _value, _attr ) {
                    group.attr(_attr, _value);
                });

                _styles.each( function ( _value, _style ) {
                    group.style(_style, _value);
                });

                var legend = group.selectAll('g')
                    .data( ( _location === 'sw' || _location === 'se' ) ? _items.slice().reverse(): _items );

                legend.exit().remove();

                legend = legend.enter()
                    .append( 'g' )
                    .merge( legend );

                legend
                    .attr('transform', function ( d, i ) {
                        var trans_x;
                        var trans_y;

                        if ( _location === 'nw' || _location === 'sw' ) {
                            trans_x = 1 + _margin.left;
                        } else {
                            trans_x = 1 + width - _box_width - _margin.right;
                        }

                        if ( _location === 'sw' || _location === 'se' ) {
                            trans_y = height - _box_height - _margin.bottom - i*(_box_height+_box_padding);
                        } else {
                            trans_y = _margin.top + i*(_box_height+_box_padding);
                        }

                        return 'translate(' + trans_x + ',' + trans_y + ')';
                    });

                var rectangles = legend.selectAll( 'rect' ).data( function ( d ) { return [d]; } );

                rectangles = rectangles
                    .enter()
                    .append('rect')
                    .merge(rectangles);

                rectangles
                    .attr( 'width', _box_width )
                    .attr( 'height', _box_height )
                    .attr( 'fill', function ( d ) { return d.item.attr('fill') || d.item.attr('stroke'); });

                var labels = legend.selectAll( 'text' ).data( function ( d ) { return [d]; } );

                labels = labels
                    .enter()
                    .append('text')
                    .merge(labels);

                labels
                    .attr( 'dominant-baseline', 'central' )
                    .attr( 'x', (_location === 'nw' || _location === 'sw') ? _box_width + _label_padding : -_label_padding )
                    .attr( 'y', _box_height / 2.0 )
                    .text( function ( d ) { return d.label } );

            }

            _legend.attr = function ( _ ) {
                if ( arguments.length === 1 ) return _attributes.get( _ );
                if ( arguments.length === 2 ) {
                    _attributes.set( arguments[0], arguments[1] );
                }
                return _legend;
            };

            _legend.box_height = function ( _ ) {
                if ( !arguments.length ) return _box_height;
                _box_height = _;
                return _legend;
            };

            _legend.box_padding = function ( _ ) {
                if ( !arguments.length ) return _box_padding;
                _box_padding = _;
                return _legend;
            };

            _legend.box_width = function ( _ ) {
                if ( !arguments.length ) return _box_width;
                _box_width = _;
                return _legend;
            };

            _legend.container = function ( _ ) {
                if ( !arguments.length ) return _container;
                _container = _;
                return _legend;
            };

            _legend.id = function () {
                return _id;
            };

            _legend.item = function ( label, item ) {
                if ( arguments.length === 1 ){
                    item = _items.find( function ( current ) {
                        return current.label === label;
                    });
                    return item ? item.item : null;
                }
                if ( typeof item === 'string' ) {
                    var color = item;
                    item = { attr: function () { return color; } };
                }
                if ( arguments.length === 2 ) {
                    var i = _items.findIndex( function ( current ) {
                        return current.item === item || color === current.item.attr();
                    });
                    if ( i > -1 ) {
                        _items[i] = { label: label, item: item };
                    } else {
                        _items.push( { label: label, item: item } );
                    }
                }
                return _legend;
            };

            _legend.label_padding = function ( _ ) {
                if ( !arguments.length ) return _label_padding;
                _label_padding = _;
                return _legend;
            };

            _legend.location = function ( _ ) {
                if ( !arguments.length ) return _location;
                _location = _;
                return _legend;
            };

            _legend.margin = function ( _ ) {
                if ( !arguments.length ) return _margin;
                _margin.top = _.top === 0 ? 0 : ( _.top || _margin.top );
                _margin.right = _.right === 0 ? 0 : _.right || _margin.right;
                _margin.bottom = _.bottom === 0 ? 0 : _.bottom || _margin.bottom;
                _margin.left = _.left === 0 ? 0 : _.left || _margin.left;
                return _legend;
            };

            _legend.remove = function ( _ ) {
                if ( !arguments.length ) {
                    var i = legends.indexOf(_legend);
                    if ( i != -1 ) {
                        legends.splice(i, 1);
                    }
                } else {
                    var index = _items.findIndex( function ( e ) {
                        return typeof _ === 'string' ? e.label === _ : e.item === _;
                    });
                    if ( index !== -1 ) {
                        _items.splice( index, 1 );
                    }
                }
            };

            _legend.style = function ( _ ) {
                if ( arguments.length === 1 ) return _styles.get( _ );
                if ( arguments.length === 2 ) _styles.set( arguments[0], arguments[1] );
            };

            legends.push( _legend );
            return _legend;

        };


        // Chart API
        _chart.domain = function ( _ ) {
            if ( !arguments.length ) return domain;
            domain = _;
            return _chart;
        };

        _chart.each = function ( _ ) {
            if ( typeof _ === 'function' ) {
                areas.forEach(_);
                lines.forEach(_);
                scatters.forEach(_);
            }
        };

        _chart.height = function ( _ ) {
            if ( !arguments.length ) return outer_height;
            outer_height = _;
            return _chart;
        };

        _chart.hover = function ( _ ) {
            if ( !arguments.length ) return hover;
            hover = _;
            return _chart;
        };

        _chart.hover_in = function ( _ ) {
            if ( !arguments.length ) return hover_in;
            hover_in = _;
            return _chart;
        };

        _chart.hover_out = function ( _ ) {
            if ( !arguments.length ) return hover_out;
            hover_out = _;
            return _chart;
        };

        _chart.id = function () {
            return id;
        };

        _chart.margin = function ( _ ) {
            if ( !arguments.length ) return margin;
            margin.top = _.top === 0 ? 0 : ( _.top || margin.top );
            margin.right = _.right === 0 ? 0 : _.right || margin.right;
            margin.bottom = _.bottom === 0 ? 0 : _.bottom || margin.bottom;
            margin.left = _.left === 0 ? 0 : _.left || margin.left;
            return _chart;
        };

        _chart.mouse_in = function () {

            var continuous_data = [].concat( areas, lines, scatters );
            _hover.call( this, continuous_data );

            if ( typeof hover_in === 'function' ) {
                hover_in.call( g.node() );
            }

        };

        _chart.mouse_move = function () {

            var continuous_data = [].concat( areas, lines, scatters );
            _hover.call( this, continuous_data );

            if ( typeof hover === 'function' ) {
                hover.call( g.node() );
            }

        };

        _chart.mouse_out = function () {

            var continuous_data = [].concat( areas, lines, scatters );
            _hover.call( this, continuous_data );

            if ( typeof hover_out === 'function' ) {
                hover_out.call( g.node() );
            }

        };

        _chart.range = function ( _ ) {
            if ( !arguments.length ) return range;
            range = _;
            return _chart;
        };

        _chart.width = function ( _ ) {
            if ( !arguments.length ) return outer_width;
            outer_width = _;
            return _chart;
        };

        _chart.x = function ( _ ) {
            if ( !arguments.length ) return x;
            x = _;
            return _chart;
        };

        _chart.x_axis = function ( _ ) {
            if ( !arguments.length ) return x_axis;
            x_axis = _;
            return _chart;
        };

        _chart.x_grid = function ( _ ) {
            if ( !arguments.length ) return x_grid;
            x_grid = _;
            return _chart;
        };

        _chart.x_label = function ( _ ) {
            if ( !arguments.length ) return x_label;
            x_label = _;
            return _chart;
        };

        _chart.x_location = function ( _ ) {
            if ( !arguments.length ) return x_location;
            x_location = _;
            return _chart;
        };

        _chart.x_scale = function ( _ ) {
            if ( !arguments.length ) return x_scale;
            x_scale = _;
            return _chart;
        };

        _chart.y = function ( _ ) {
            if ( !arguments.length ) return y;
            y = _;
            return _chart;
        };

        _chart.y_axis = function ( _ ) {
            if ( !arguments.length ) return y_axis;
            y_axis = _;
            return _chart;
        };

        _chart.y_grid = function ( _ ) {
            if ( !arguments.length ) return y_grid;
            y_grid = _;
            return _chart;
        };

        _chart.y_label = function ( _ ) {
            if ( !arguments.length ) return y_label;
            y_label = _;
            return _chart;
        };

        _chart.y_location = function ( _ ) {
            if ( !arguments.length ) return y_location;
            y_location = _;
            return _chart;
        };

        _chart.y_scale = function ( _ ) {
            if ( !arguments.length ) return y_scale;
            y_scale = _;
            return _chart;
        };


        // Helper functions
        function _build_axes ( _g ) {

            if ( x_axis ) {
                x_axis.scale( x_scale );
                _g.select('.x.axis')
                    .attr('transform', 'translate(0,' + _calculate_x_axis_location( x_location ) + ')')
                    .style('shape-rendering', 'crispEdges')
                    .call(x_axis);

            }
            if ( y_axis ) {
                y_axis.scale( y_scale );
                _g.select('.y.axis')
                    .attr('transform', 'translate(' + _calculate_y_axis_location( y_location ) + ',0)')
                    .style('shape-rendering', 'crispEdges')
                    .call(y_axis);
            }

            if ( x_grid && typeof x_grid == "boolean" ) x_grid = '2,2';
            if ( y_grid && typeof y_grid == "boolean" ) y_grid = '2,2';

            if ( x_grid ) {

                var _x_minor = _g.select('.x.axis.minor')
                    .attr('transform', 'translate(0,' + y_scale.range()[ 0 ] + ')')
                    .style('shape-rendering', 'crispEdges')
                    .call(
                        d3.axisBottom(x_scale).tickSizeInner(-height)
                    );

                _x_minor.selectAll('text')
                    .style('display', 'none');

                _x_minor.selectAll('.domain')
                    .style('display', 'none');

                _x_minor.selectAll('line')
                    .style('stroke', '#777')
                    .style('stroke-opacity', 0.35)
                    .style('stroke-dasharray', x_grid);

            }

            if ( y_grid ) {

                var _y_minor = _g.select('.y.axis.minor')
                    .style('shape-rendering', 'crispEdges')
                    .call(
                        d3.axisLeft(y_scale).tickSizeInner(-width)
                    );

                _y_minor.selectAll('text')
                    .style('display', 'none');

                _y_minor.selectAll('.domain')
                    .style('display', 'none');

                _y_minor.selectAll('line')
                    .style('stroke', '#777')
                    .style('stroke-opacity', 0.35)
                    .style('stroke-dasharray', y_grid);

            }

        }

        function _build_hover_area ( _g ) {

            var mouse_area = _g.selectAll('#m' + id)
                              .data([ 'mousearea' ]);

            mouse_area.exit()
                      .remove();

            mouse_area = mouse_area.enter()
                                   .append('rect')
                                   .attr('id', 'm' + id)
                                   .merge(mouse_area)
                                   .attr('width', width)
                                   .attr('height', height)
                                   .attr('stroke', 'none')
                                   .attr('fill', 'none')
                                   .attr('pointer-events', 'all');

            mouse_area.on( 'mouseover touchstart', _chart.mouse_in );
            mouse_area.on( 'mousemove touchmove', _chart.mouse_move );
            mouse_area.on( 'mouseout touchend touchcancel', _chart.mouse_out );

        }

        function _build_labels ( _g ) {

            if ( x_label ) {

                var x_selection = _g.selectAll('.x.label').data([ x_label ]);

                x_selection.enter()
                           .append('text')
                           .attr('class', 'x label')
                           .merge(x_selection)
                           .style('font', '10px sans-serif')
                           .style('text-anchor', 'end')
                           .attr('x', width - 6)
                           .attr('y', _calculate_x_axis_location(x_location) - 6)
                           .text(x_label);
            }

            if (  y_label ) {

                var y_selection = _g.selectAll('.y.label').data([ y_label ]);

                y_selection.enter()
                           .append('text')
                           .attr('class', 'y label')
                           .merge(y_selection)
                           .style('font', '10px sans-serif')
                           .style('text-anchor', 'end')
                           .attr('x', -6)
                           .attr('y', _calculate_y_axis_location(y_location) + 14)
                           .attr('transform', 'rotate(-90)')
                           .text(y_label);

            }

        }

        function _build_scales () {

            x_scale = x_scale || d3.scaleLinear();
            y_scale = y_scale || d3.scaleLinear();

            // Update the scales to fit the plotting area
            x_scale.range([ 0, width ]);
            y_scale.range([ height, 0 ]);

            var data = [].concat( areas, bars, lines, scatters );

            // Update domains
            if ( domain ) {
                x_scale.domain( domain );
            } else {

                var xmin = d3.min( data, function ( d ) { return d3.min( d.data(), d.x() ); } );
                var xmax = d3.max( data, function ( d ) { return d3.max( d.data(), d.x() ); } );

                x_scale.domain([ xmin, xmax ]);
            }

            if ( range ) {
                y_scale.domain( range );
            } else {

                var ymin = d3.min( data, function ( d ) {
                    return d3.min( d.data(), d.y ? d.y() : function ( _d ) { return d3.min([d.y0()(_d), d.y1()(_d)])} )
                });
                var ymax = d3.max( data, function ( d ) {
                    return d3.max( d.data(), d.y ? d.y() : function ( _d ) { return d3.max([d.y0()(_d), d.y1()(_d)])} )
                } );

                y_scale.domain([ ymin, ymax ]);

            }

        }

        function _calculate_x_axis_location ( _v ) {

            if ( _v === 'top' ) {
                return y_scale.range()[ 1 ];
            }

            if ( typeof _v === 'string' ) {
                if ( _v.slice(-1) === '%' ) {
                    var percent = parseFloat( _v ) / 100.0;
                    return d3.interpolateNumber( y_scale.range()[0], y_scale.range()[1] )( percent );
                }
                if ( _v.slice(-2) === 'px' ) {
                    return parseFloat( _v );
                }
            }

            if ( y_scale( _v ) ) return y_scale( _v );

            return y_scale.range()[ 0 ];

        }

        function _calculate_y_axis_location ( _v ) {

            if ( _v === 'right' ) {
                return x_scale.range()[ 1 ];
            }

            if ( typeof _v === 'string' ) {
                if ( _v.slice(-1) === '%' ) {
                    var percent = parseFloat( _v ) / 100.0;
                    return d3.interpolateNumber( x_scale.range()[0], x_scale.range()[1] )( percent );
                }
                if ( _v.slice(-2) === 'px' ) {
                    return parseFloat( _v );
                }
            }

            if ( x_scale( _v ) ) return x_scale( _v );

            return x_scale.range()[0];

        }

        function _constant ( _x ) {
            return function () {
                return _x;
            }
        }

        function _gen_id () {

            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }

            return 'a' + s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();

        }

        function _hover( _d ) {

            if ( x_scale.invert ) {

                var mouse = d3.mouse( this );
                var x = x_scale.invert( mouse[0] );
                var y = mouse[1];

                _d.forEach( function ( d ) {

                    if ( d.hover_in() || d.hover() || d.hover_out() ) {

                        var extent = d.x_extent();
                        var x_in = x >= extent[ 0 ] && x <= extent[ 1 ];
                        var y_in = y >= 0 && y <= height;
                        var m_in = x_in && y_in;
                        var last_x_in = last_mouse_x >= extent[ 0 ] && last_mouse_x <= extent[ 1 ];
                        var last_y_in = last_mouse_y >= 0 && last_mouse_y <= height;
                        var last_m_in = last_x_in && last_y_in;

                        if ( m_in ) {
                            if ( !last_m_in ) {
                                d.mouse_in();
                            }
                            d.mouse_move(x);
                        } else if ( last_m_in ) {
                            d.mouse_out();
                        }

                    }

                });

                last_mouse_x = x;
                last_mouse_y = y;

            }

        }

        function _nearest_index ( _p, _b, _x ) {

            var _data = _p.data();

            if ( _p.x()(_data[0]) <= _x && _x <= _p.x()(_data[_data.length-1]) ) {

                var d, i = _b( _data, _x );

                var d0 = _data[ i - 1 ];
                var d1 = _data[ i ];

                if ( d0 && d1 ) {
                    if ( _x - _p.x()( d0 ) > _p.x()( d1 ) - _x ) {
                        d = d1;
                    } else {
                        d = d0;
                        i = i - 1;
                    }
                } else {
                    if ( d0 ) {
                        d = d0;
                        i = i - 1;
                    } else {
                        d = d1;
                    }
                }
            }

            return d ? i : -1;

        }

        function _next_color () {

            if ( _current_color >= _colors.length ) _current_color = 0;
            return _colors[ _current_color++ ];

        }

        function _update_group ( _g, _c, _d ) {

            var _selection = _g.selectAll('g')
                          .filter('.' + _c)
                          .data(_d, function ( item ) {
                              return item.id();
                          });

            _selection.exit()
                  .remove();

            _selection.enter()
                  .append('g')
                  .attr('class', _c)
                  .merge(_selection)
                  .each(function ( _item ) {

                      _item(d3.select(this));

                  });

        }

        function _update_legends ( _g ) {

            legends.forEach( function ( legend ) {

                var lg = legend.container();
                var custom = !!lg;
                if ( lg ) {
                    lg = lg.selectAll( 'svg' ).filter( '#cl' + legend.id()  ).data( [legend] );
                    lg = lg.enter()
                           .append( 'svg' )
                           .attr('id', 'cl' + legend.id() )
                           .merge( lg );
                } else {
                    lg = _g;
                }

                _update_group( lg, 'legendgroup', [legend] );

                if ( custom ) {
                    lg.call(function ( s ) {

                        var bbox = s.node().getBBox();
                        s.attr('width', bbox.width)
                         .attr('height', bbox.height);
                        s.selectAll( '.legendgroup' )
                         .attr('transform', 'translate(' + (-bbox.x) + ',' + (-bbox.y) + ')');
                    });
                }

            });

            _g.selectAll('.legendgroup').each( function () {
                this.parentElement.appendChild( this );
            });

        }

        return _chart;

    }

    // Tools
    chart.linker = function () {

        var charts = d3.map();

        function _linker() {
        }

        _linker.link = function ( chart ) {

            charts.set( chart.id(), chart );

            chart.hover(_linker.hover)
                .hover_in(_linker.hover_in)
                .hover_out(_linker.hover_out);

            return _linker;

        };

        _linker.unlink = function ( chart ) {

            charts.remove( chart.id() );

            chart.hover(null)
                .hover_in(null)
                .hover_out(null);

            return _linker;

        };

        _linker.hover = function () {

            var caller = this;
            var caller_id = d3.select(caller).attr('id');

            charts.each(function ( chart, id ) {
                if ( id !== caller_id ) {
                    var hover = chart.hover();
                    chart.hover(null);
                    chart.mouse_move.call(caller);
                    chart.hover(hover);
                }
            });

        };

        _linker.hover_in = function () {

            var caller = this;
            var caller_id = d3.select(caller).attr('id');
            charts.each(function ( chart, id ) {
                if ( id !== caller_id ) {
                    var hover_in = chart.hover_in();
                    chart.hover_in(null);
                    chart.mouse_in.call(caller);
                    chart.hover_in(hover_in);
                }
            });

        };

        _linker.hover_out = function () {

            var caller = this;
            var caller_id = d3.select(caller).attr('id');
            charts.each(function ( chart, id ) {
                if ( id !== caller_id ) {
                    var hover_out = chart.hover_out();
                    chart.hover_out(null);
                    chart.mouse_out.call(caller);
                    chart.hover_out(hover_out);
                }
            });

        };

        return _linker;

    };

    exports.chart = chart;

    Object.defineProperty(exports, '__esModule', { value: true });

}));