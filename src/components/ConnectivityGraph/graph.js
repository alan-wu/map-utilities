/*==============================================================================

A viewer for neuron connectivity graphs.

Copyright (c) 2019 - 2024  David Brooks

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

==============================================================================*/

import cytoscape from 'cytoscape'

//==============================================================================


//==============================================================================

export class ConnectivityGraph extends EventTarget
{
    cyg = null
    nodes = []
    edges = []
    axons = []
    dendrites = []
    labelCache = new Map()
    graphCanvas = null

    constructor(labelCache, graphCanvas)
    {
        super()
        this.labelCache = labelCache;
        this.graphCanvas = graphCanvas;
    }

    async addConnectivity(knowledge)
    //=====================================================
    {
        this.axons = knowledge.axons.map(node => JSON.stringify(node))
        this.dendrites = knowledge.dendrites.map(node => JSON.stringify(node))
        if (knowledge.connectivity.length) {
            for (const edge of knowledge.connectivity) {
                const e0 = await this.graphNode(edge[0])
                const e1 = await this.graphNode(edge[1])
                this.nodes.push(e0)
                this.nodes.push(e1)
                this.edges.push({
                    id: `${e0.id}_${e1.id}`,
                    source: e0.id,
                    target: e1.id
                })
            }
        } else {
            this.nodes.push({
                id: 'MISSING',
                label: 'NO PATHS'
            })
        }
    }

    showConnectivity(graphCanvas)
    //================
    {
        this.cyg = new CytoscapeGraph(this, graphCanvas)

        this.cyg.on('tap-node', (event) => {
            const tapEvent = new CustomEvent('tap-node', {
                detail: event.detail
            })
            this.dispatchEvent(tapEvent);
        });
    }

    clearConnectivity()
    //=================
    {
        if (this.cyg?.cy) {
            this.cyg.cy.remove()
            this.cyg.cy = null
        }
    }

    reset()
    //=====
    {
        if (this.cyg?.cy) {
            this.cyg.cy.reset()
        }
    }

    zoom(val)
    //=======
    {
        if (this.cyg?.cy) {
            const currentZoom = this.cyg.cy.zoom()
            const width = this.cyg.cy.width()
            const height = this.cyg.cy.height()
            const positionToRender = {
                x: width/2,
                y: height/2,
            }
            this.cyg.cy.zoom({
                level: currentZoom + val,
                renderedPosition: positionToRender,
            })
        }
    }

    enableZoom(option)
    //================
    {
        if (this.cyg?.cy) {
            this.cyg.cy.userZoomingEnabled(option)
        }
    }

    get elements()
    //============
    {
        return [
            ...this.nodes.map(n => { return {data: n}}),
            ...this.edges.map(e => { return {data: e}})
        ]
    }

    get roots()
    //===================
    {
        return this.dendrites
    }

    async graphNode(node)
    //=======================================================
    {
        const id = JSON.stringify(node)
        const label = [node[0], ...node[1]]
        const humanLabels = []
        for (const term of label) {
            const humanLabel = this.labelCache.has(term) ? this.labelCache.get(term) : ''
            humanLabels.push(humanLabel)
        }
        label.push(...humanLabels)

        const result = {
            id,
            label: label.join('\n')
        }
        if (this.axons.includes(id)) {
            if (this.dendrites.includes(id)) {
                result['both-a-d'] = true
            } else {
                result['axon'] = true
            }
        } else if (this.dendrites.includes(id)) {
            result['dendrite'] = true

        }
        return result
    }

    on(eventName, callback)
    //=====================
    {
        this.addEventListener(eventName, callback)
    }
}

//==============================================================================

const GRAPH_STYLE = [
    {
        'selector': 'node',
        'style': {
            'label': function(ele) { return trimLabel(ele.data('label')) },
            // 'background-color': '#80F0F0',
            'background-color': 'transparent',
            'background-opacity': '0',
            'text-valign': 'center',
            'text-wrap': 'wrap',
            'width': '80px',
            'height': '80px',
            'text-max-width': '80px',
            'font-size': '6px',
            'shape': 'round-rectangle',
            'border-width': 1,
            'border-style': 'solid',
            'border-color': 'gray',
        }
    },
    {
        'selector': 'node[axon]',
        'style': {
            // 'background-color': 'green',
            'shape': 'round-diamond',
            'width': '100px',
            'height': '100px',
        }
    },
    {
        'selector': 'node[dendrite]',
        'style': {
            // 'background-color': 'red',
            'shape': 'ellipse',
        }
    },
    {
        'selector': 'node[both-a-d]',
        'style': {
            // 'background-color': 'gray',
            'shape': 'round-rectangle',
        }
    },
    {
        'selector': 'edge',
        'style': {
            'width': 1,
            'line-color': 'dimgray',
            'target-arrow-color': 'dimgray',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
        }
    }
]

function trimLabel(label) {
    const labels = label.split('\n')
    const half = labels.length/2
    const trimLabels = labels.slice(half)
    return trimLabels.join('\n')
}

function capitalizeLabels(input) {
    return input.split('\n').map(label => {
        if (label && label[0] >= 'a' && label[0] <= 'z') {
            return label.charAt(0).toUpperCase() + label.slice(1)
        }
        return label
    }).join('\n')
}

//==============================================================================

class CytoscapeGraph extends EventTarget
{
    cy
    tooltip

    constructor(connectivityGraph, graphCanvas)
    {
        super()
        this.cy = cytoscape({
            container: graphCanvas,
            elements: connectivityGraph.elements,
            layout: {
                name: 'breadthfirst',
                circle: false,
                roots: connectivityGraph.roots
            },
            directed: true,
            style: GRAPH_STYLE,
            minZoom: 0.5,
            maxZoom: 10,
            wheelSensitivity: 0.4,
        }).on('mouseover', 'node', this.overNode.bind(this))
          .on('mouseout', 'node', this.exitNode.bind(this))
          .on('position', 'node', this.moveNode.bind(this))
          .on('tap', this.tapNode.bind(this))

        this.tooltip = document.createElement('div')
        this.tooltip.className = 'cy-graph-tooltip'
        this.tooltip.hidden = true
        graphCanvas?.lastChild?.appendChild(this.tooltip)
    }

    remove()
    //======
    {
        if (this.cy) {
            this.cy.destroy()
        }
    }

    checkRightBoundary(leftPos)
    //==================================
    {
        if ((leftPos + this.tooltip.offsetWidth) >= this.tooltip.parentElement?.offsetWidth) {
            this.tooltip.style.left = `${leftPos - this.tooltip.offsetWidth}px`
        }
    }

    overNode(event)
    //==============
    {
        const node = event.target
        const label = capitalizeLabels(node.data().label)

        this.tooltip.innerText = label
        this.tooltip.style.left = `${event.renderedPosition.x}px`
        this.tooltip.style.top = `${event.renderedPosition.y}px`
        this.tooltip.style.maxWidth = '240px'
        this.tooltip.hidden = false

        this.checkRightBoundary(event.renderedPosition.x)
    }

    moveNode(event)
    //==============
    {
        const node = event.target
        this.tooltip.style.left = `${node.renderedPosition().x}px`
        this.tooltip.style.top = `${node.renderedPosition().y}px`
        this.checkRightBoundary(node.renderedPosition().x)
    }

    exitNode(event)
    //==============
    {
        this.tooltip.hidden = true
    }

    tapNode(event)
    //============
    {
        const node = event.target
        const data = node.data()
        const tapEvent = new CustomEvent('tap-node', {
            detail: data
        })
        this.dispatchEvent(tapEvent);
    }

    on(eventName, callback)
    //=====================
    {
        this.addEventListener(eventName, callback)
    }
}

//==============================================================================
