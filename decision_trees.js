// Define the svg dimensions
var margin = {'top': 40, 'right': 80, 'bottom': 40, 'left': 80};
var width = 800 - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;
var border = true;

// Define the tree properties
var nodeSize = 30,
  initialType = 'randomEvent',
  initialValue = '0',
  initialProbability = '0',
  unit = '',
  currency = '$',
  defaultDelay = 300;

// Create the svg area
var svg = d3.select('body')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom);

// Add border around svg
if (border) {
  var border = svg.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .style('stroke', 'black')
    .style('fill', 'none')
    .style('stoke-width', 1);
}

// Create the group for main diagram
var vis = svg.append('g')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  .classed('vis', true);

// Groups for various elements
vis.append('g')
    .attr('id', 'links');
vis.append('g')
    .attr('id', 'nodes');
vis.append('g')
    .attr('id', 'valueLabels');
vis.append('g')
    .attr('id', 'nameLabels');
vis.append('g')
    .attr('id', 'probabilityLabels');

// Construct the tree layout
var tree = d3.layout.tree()
  .size([height, width])
  .separation(function(a, b) {
    console.log(nodeSize);
    return (a.parent == b.parent) ? nodeSize : 1.5*nodeSize;
  });

// Links generator
var diagonal = d3.svg.diagonal()
  .projection(function(d) {return [d.y, d.x];});

// Tree data
var data = {'id':0},
    node = {},
    nodes,
    links,
    valueLabels,
    nameLabels;

// Menu
var menu = [
  {
    title: 'Decision',
    action: function(elm, d, i) {
      d.type = 'decision';
      update(defaultDelay);
    }
  },
  {
    title: 'Random event',
    action: function(elm, d, i) {
      d.type = 'randomEvent';
      update(defaultDelay);
    }
  },
  {
    title: 'Remove children',
    action: function(elm, d, i) {
      d.children = null;
      update(defaultDelay);
    }
  },
  {
    title: 'Remove node',
    action: function(elm, d, i) {
      if (d.parent) {
        for (var i = 0; i < d.parent.children.length; i++) {
          if (d.parent.children[i].id == d.id) {
            d.parent.children.splice(i, 1);
            break;
          }
        }
      }
      update(defaultDelay);
    }
  }
]

// Drag behaviour
var drag = d3.behavior.drag()
    .origin(function(d) {return {'x': d.y, 'y': d.x};});

drag.on('dragstart', function(d) {
  d3.select(this).classed('dragged', true);
  d3.event.sourceEvent.stopPropagation(); // silence other listeners
})
.on('dragend', function(d) {
  d3.select(this)
      .transition()
      .duration(defaultDelay)
      .attr('x', d.py - nodeSize*1.42/2)
      .attr('y', d.px - nodeSize*1.42/2);
  d3.select(this).classed('dragged', false);
  update(true);
  d3.event.sourceEvent.stopPropagation(); // silence other listeners
})
.on('drag', function(d) {
  // Move the node
  d3.select(this)
      .attr('y', d3.event.y - nodeSize*1.42/2);

  // Compare its y position to the siblings
  if (d.parent) {
    var siblings = d.parent.children;
    siblings.sort(function(a, b) {
      var ax = (a.id == d.id) ? d3.event.y : a.x;
      var bx = (b.id == d.id) ? d3.event.y : b.x;
      return ax - bx;
    });
    d.parent.children = siblings;
  }

  d3.event.sourceEvent.stopPropagation(); // silence other listeners
})

n = 0;
var update = function(delay) {
  // Create the tree nodes and links
  nodes = tree.nodes(data);
  links = tree.links(nodes);

  // All nodes are randomEvent's initially
  nodes.forEach(function(d) {
    if (!d.hasOwnProperty('type')) {
      d.type = initialType;
      d.name = 'Node ' + d.id;
      d.value = initialValue;
      d.probability = initialProbability;
    }
  })

  // Bind the data to the links
  link = d3.select('#links')
      .selectAll('path.link')
      .data(links, function(d) {return d.source.id + '-' + d.target.id;});

  link.enter().append('path')
      .attr('class', 'link')
      .attr('d', function(d) {
        var o = {'x': d.source.px, 'y': d.source.py};
        return diagonal({'source': o, 'target': o});
      });

  link.exit().remove();

  // Bind the data to the nodes
  node = d3.select('#nodes')
      .selectAll('rect')
      .data(nodes, function(d) {return d.id;});

  // Add entering nodes
  node.enter().append('rect')
      .classed('node', true)
      .attr('x', function(d) {
        return (d.parent) ? d.parent.py-nodeSize*1.42/2 : d.y-nodeSize*1.42/2;
      })
      .attr('y', function(d) {
        return (d.parent) ? d.parent.px-nodeSize*1.42/2 : d.x-nodeSize*1.42/2;
      })
      .attr('width', 1.42*nodeSize)
      .attr('height', 1.42*nodeSize)
      .on('mouseover', function(d) {
        d3.select(this)
          .classed('highlight', true);
      })
      .on('mouseout', function(d) {
        d3.select(this)
          .classed('highlight', false);
      })
      .on('click', function(d) {
        if (d3.event.defaultPrevented) return;

        // Add new node
        var newNode = {'id': ++n};
        if (!d.children)
          d.children = []
        d.children.push(newNode);
        nodes.push(newNode);

        // Remove the highlights
        node.classed('node-highlight', false);

        // Update the graphics
        update(defaultDelay);
      })
      .call(drag)
      .on('contextmenu', d3.contextMenu(menu)); // attach menu to element

  node.exit().remove();

  // Bind the data to the labels
  valueLabels = d3.select('#valueLabels')
      .selectAll('text')
      .data(nodes, function(d) {return d.id;});
  nameLabels = d3.select('#nameLabels')
      .selectAll('text')
      .data(nodes, function(d) {return d.id;});
  probabilityLabels = d3.select('#probabilityLabels')
      .selectAll('text')
      .data(nodes, function(d) {return d.id;});

  // Add new labels
  valueLabels.enter().append('text')
      .classed('valueLabel', true)
      .text(function(d) {return currency + d.value + unit;})
      .attr('x', function(d){
        var x = (d.parent) ? d.parent.py : d.y;
        return x - nodeSize;
      })
      .attr('y', function(d) {
        var y = (d.parent) ? d.parent.px : d.x;
        return y + nodeSize/2;
      })
      .attr('dy', '0.3em')
      .attr('text-anchor', 'end').on('click', function(d) {
        var result = prompt('Enter the value for the node', d.value);
        if(result) {
            d.value = parseFloat(result);
            d3.select(this).text(currency + d.value + unit);
        }
      })
      .on('mouseover', function(d) {
          d3.select(this).classed('highlight', true);
      })
      .on('mouseout', function(d) {
        d3.select(this).classed('highlight', false);
      });

  valueLabels.exit().remove();

  nameLabels.enter().append('text')
      .classed('nameLabel', true)
      .text(function(d) {return d.name;})
      .attr('x', function(d){
        return (d.parent) ? d.parent.py-nodeSize : d.y-nodeSize;
      })
      .attr('y', function(d) {
        return (d.parent) ? d.parent.px-nodeSize/2 : d.x-nodeSize/2;
      })
      .attr('dy', '0.3em')
      .attr('text-anchor', 'end').on('click', function(d) {
        var result = prompt('Enter the name of the node', d.name);
        if(result) {
            d.name = result;
            d3.select(this).text(d.name);
        }
      })
      .on('mouseover', function(d) {
          d3.select(this).classed('highlight', true);
      })
      .on('mouseout', function(d) {
        d3.select(this).classed('highlight', false);
      });

  nameLabels.exit().remove();

  probabilityLabels.enter().append('text')
      .classed('probabilityLabel', true)
      .text(function(d) {return d.probability + '%';})
      .attr('x', function(d){
        return (d.parent) ? d.parent.py-nodeSize : d.y-nodeSize;
      })
      .attr('y', function(d) {
        return (d.parent) ? d.parent.px : d.x;
      })
      .attr('dy', '0.3em')
      .attr('text-anchor', 'end').on('click', function(d) {
        var result = prompt('Enter the probability for this random event', d.probability);
        if(result) {
            d.probability = result/100.0;
            d3.select(this).text(d.probability * 100 + '%');
        }
      })
      .on('mouseover', function(d) {
          d3.select(this).classed('highlight', true);
      })
      .on('mouseout', function(d) {
        d3.select(this).classed('highlight', false);
      });

  probabilityLabels.exit().remove();

  // Transition nodes and links to their new positions.
  var t = svg.transition()
      .duration(delay);

  // Update links
  t.selectAll('.link')
      .attr('d', diagonal);

  // Update nodes
  t.selectAll('.node')
      .attr('x', function(d) {
        d.py = d.y;
        return d.y-nodeSize*1.42/2;
      })
      .attr('y', function(d) {
        d.px = d.x;
        return d.x-nodeSize*1.42/2;
      })
      .attr('width', 1.42*nodeSize)
      .attr('height', 1.42*nodeSize)
      .attr('rx', function(d) {
        return d.type == 'decision' ? 0 : nodeSize*1.42/2;
      })
      .attr('ry', function(d) {
        return d.type == 'decision' ? 0 : nodeSize*1.42/2;
      });

  // Update labels
  if (nodeSize >= 22) {
    t.selectAll('.valueLabel')
        .attr('x', function(d) {return d.y-nodeSize})
        .attr('y', function(d) {return d.x+nodeSize/2})
        .attr('text-anchor', 'end')
        .attr('dy', '0.3em');
    t.selectAll('.nameLabel')
        .attr('x', function(d) {return d.y-nodeSize})
        .attr('y', function(d) {return d.x-nodeSize/2})
        .attr('text-anchor', 'end')
        .attr('dy', '0.3em');
    t.selectAll('.probabilityLabel')
        .attr('x', function(d) {return d.y-nodeSize})
        .attr('y', function(d) {return d.x})
        .attr('dy', '0.3em');
  }
  else {
    t.selectAll('.valueLabel')
        .attr('x', function(d) {return d.y;})
        .attr('y', function(d) {return d.x+nodeSize/2+6})
        .attr('text-anchor', 'middle')
        .attr('dy', '1em');
    t.selectAll('.nameLabel')
        .attr('x', function(d) {return d.y;})
        .attr('y', function(d) {return d.x-nodeSize/2-8})
        .attr('text-anchor', 'middle')
        .attr('dy', '0');
    t.selectAll('.probabilityLabel')
        .attr('x', function(d) {return d.y-nodeSize})
        .attr('y', function(d) {return d.x});
  }
}

// For changing the node radius
var updateNodeSize = function(nSize) {
  d3.select('#node-radius-value').text(nSize);
  d3.select('#node-radius').property('value', nSize);
  nodeSize = nSize;
  update(0);
}
d3.select('#node-radius').on('input', function() {
    updateNodeSize(parseInt(this.value));
  });

// Currency
var updateCurrency = function(curr) {
  currency = curr;
  d3.selectAll('.valueLabel')
      .text(function(d) {return currency + d.value + unit;});
}
d3.select('#currency').on('input', function() {
    updateCurrency(this.value);
  });

// Unit
var updateUnit = function(u) {
  unit = u;
  d3.selectAll('.valueLabel')
      .text(function(d) {return currency + d.value + unit;});
}
d3.select('#unit').on('input', function() {
    updateUnit(this.value);
  });

// Initialise the input to the proper values
updateNodeSize(nodeSize);
d3.select('#currency')
    .property('value', currency);
d3.select('#unit')
    .property('value', unit);

// Draw
update(defaultDelay);
