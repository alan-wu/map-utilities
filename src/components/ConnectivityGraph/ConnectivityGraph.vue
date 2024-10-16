<template>
  <div class="connectivity-graph">
    <div ref="graphCanvas" class="graph-canvas"></div>
    <div class="control-panel">
      <div class="node-key">
        <div class="key-head">Node type:</div>
        <div>
          <div><span>Node:</span><span class="key-box" style="background: #80F0F0"/></div>
          <div><span>Axon:</span><span class="key-box" style="background: green"/></div>
          <div><span>Dendrite:</span><span class="key-box" style="background: red"/></div>
          <div><span>Both:</span><span class="key-box" style="background: gray"/></div>
        </div>
      </div>
      <div class="tools">
        <el-tooltip
          :content="resetLabel"
          placement="bottom"
          effect="control-tooltip"
        >
          <el-button
            class="control-button"
            :class="theme"
            size="small"
            @click="reset"
          >
            <el-icon color="white">
              <el-icon-aim />
            </el-icon>
            <span class="visually-hidden">{{ resetLabel }}</span>
          </el-button>
        </el-tooltip>
        <el-tooltip
          :content="zoomLockLabel"
          placement="bottom"
          effect="control-tooltip"
        >
          <el-button
            class="control-button"
            :class="theme"
            size="small"
            @click="toggleZoom"
          >
            <el-icon color="white">
              <template v-if="zoomEnabled">
                <el-icon-lock />
              </template>
              <template v-else>
                <el-icon-unlock />
              </template>
            </el-icon>
            <span class="visually-hidden">{{ zoomLockLabel }}</span>
          </el-button>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script>
import { ConnectivityGraph } from './graph';

const MIN_SCHEMA_VERSION = 1.3;
const RESET_LABEL = 'Reset position';
const ZOOM_LOCK_LABEL = 'Lock zoom (to scroll)';
const ZOOM_UNLOCK_LABEL = 'Unlock zoom';
const APP_PRIMARY_COLOR = '#8300bf';

export default {
  name: 'ConnectivityGraph',
  props: {
    /**
     * Entity to load its connectivity graph.
     */
    entry: {
      type: String,
      default: '',
    },
    mapServer: {
      type: String,
      default: '',
    },
  },
  data: function () {
    return {
      cy: null,
      connectivityGraph: null,
      knowledgeByPath: new Map(),
      labelledTerms: new Set(),
      labelCache: new Map(),
      resetLabel: RESET_LABEL,
      zoomLockLabel: ZOOM_LOCK_LABEL,
      iconColor: APP_PRIMARY_COLOR,
      zoomEnabled: false,
    };
  },
  mounted() {
    this.run().then((res) => {
      this.showGraph(this.entry);
    });
  },
  methods: {
    run: async function () {
      const schemaVersion = await this.getSchemaVersion();
      if (schemaVersion < MIN_SCHEMA_VERSION) {
        console.warn('No Server!');
        return;
      }
      this.showSpinner();
      const selectedSource = await this.setSourceList();
      await this.setPathList(selectedSource)
      this.hideSpinner();
    },
    showGraph: async function (neuronPath) {
      const graphCanvas = this.$refs.graphCanvas;
      this.showSpinner();
      this.connectivityGraph = new ConnectivityGraph(this.labelCache, graphCanvas);
      await this.connectivityGraph.addConnectivity(this.knowledgeByPath.get(neuronPath));
      this.hideSpinner();
      this.connectivityGraph.showConnectivity(graphCanvas);
      this.currentPath = neuronPath
    },
    query: async function (sql, params) {
      const url = `${this.mapServer}knowledge/query/`;
      const query = { sql, params }
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            "Accept": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(query)
        });
        if (!response.ok) {
          throw new Error(`Cannot access ${url}`);
        }
        return await response.json();
      } catch {
        return {
          values: []
        };
      }
    },
    setSourceList: async function () {
      const data = await this.getJsonData(`${this.mapServer}knowledge/sources`);
      const sources = data ? (data.sources || []) : [];

      // Order with most recent first...
      let firstSource = '';
      const sourceList = [];
      for (const source of sources) {
        if (source) {
          sourceList.push(source);
          if (firstSource === '') {
            firstSource = source;
          }
        }
      }
      return firstSource;
    },
    setPathList: async function (source) {
      const data = await this.query(
        `select entity, knowledge from knowledge
          where entity like 'ilxtr:%' and source=?
          order by entity`,
        [source]);
      const pathList = [];
      this.knowledgeByPath.clear();
      this.labelledTerms = new Set();
      for (const [key, jsonKnowledge] of data.values) {
        const knowledge = JSON.parse(jsonKnowledge);
        if ('connectivity' in knowledge) {
          const label = knowledge.label || key;
          const shortLabel = (label === key.slice(6).replace('-prime', "'").replaceAll('-', ' '))
                              ? ''
                              : (label.length < 50) ? label : `${label.slice(0, 50)}...`;
          pathList.push(key);
          this.knowledgeByPath.set(key, knowledge);
          this.cacheLabels(knowledge);
        }
      }
      await this.getCachedTermLabels();
      return '';
    },
    getSchemaVersion: async function () {
      const data = await this.getJsonData(`${this.mapServer}knowledge/schema-version`);
      return data ? (+data.version || 0) : 0;
    },
    getJsonData: async function (url) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            "Accept": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) {
          console.error(`Cannot access ${url}`);
        }
        return await response.json();
      } catch {
        return null;
      }
    },
    getCachedTermLabels: async function () {
      if (this.labelledTerms.size) {
        const termLabels = await this.query(`
          select entity, label from labels
          where entity in (?${', ?'.repeat(this.labelledTerms.size-1)})`,
          [...this.labelledTerms.values()]
        );
        for (const termLabel of termLabels.values) {
          this.labelCache.set(termLabel[0], termLabel[1]);
        }
      }
    },
    cacheNodeLabels: function (node) {
      for (const term of [node[0], ...node[1]]) {
        this.labelledTerms.add(term);
      }
    },
    cacheLabels: async function (knowledge) {
      for (const edge of knowledge.connectivity) {
        this.cacheNodeLabels(edge[0]);
        this.cacheNodeLabels(edge[1]);
      }
    },
    showSpinner: function () {
      // show loading spinner
    },
    hideSpinner: function () {
      // hide loading spinner
    },
    reset: function () {
      this.connectivityGraph.reset();
    },
    /**
     * Enable/disable user zoom for scrolling
     */
    toggleZoom: function () {
      this.zoomEnabled = !this.zoomEnabled;
      this.zoomLockLabel = this.zoomEnabled ? ZOOM_UNLOCK_LABEL : ZOOM_LOCK_LABEL;
      this.connectivityGraph.enableZoom(!this.zoomEnabled);
    },
  },
};
</script>

<style lang="scss" scoped>
.connectivity-graph,
.graph-canvas {
  width: 100%;
  height: 600px;
  background-color: white;
  position: relative;
}

.connectivity-graph {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px #e4e7ed;
}

.control-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.node-key {
  border: 1px solid $app-primary-color;
  padding: 4px;
  background-color: rgba(240, 240, 240, 0.8);

  div div {
    width: 90px;
  }
}

.key-head {
  text-align: center;
  font-weight: bold;
  border-bottom: 1px solid gray;
  padding-bottom: 4px;
  margin-bottom: 4px;
}

.key-box {
  float: right;
  width: 12px;
  height: 12px;
}

.tools {
  margin-top: 1rem;
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: flex-end;
  justify-content: flex-end;
}

.control-button {
  margin: 0 !important;
  padding: 0.25rem !important;
  font-size: 14px !important;
  border-color: $app-primary-color !important;
  background: $app-primary-color !important;
  transition: all 0.25s ease;

  &,
  &:focus,
  &:active {
    box-shadow: none !important;
  }

  &:hover {
    background: $lightPurple !important;
  }
}

.visually-hidden {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
</style>

<style lang="scss">
  .el-popper.is-control-tooltip {
    padding: 4px 10px;
    font-family: Asap;
    background: #f3ecf6 !important;
    border: 1px solid $app-primary-color;

    & .el-popper__arrow::before {
      border: 1px solid;
      border-color: $app-primary-color;
      background: #f3ecf6;
    }
  }
</style>
