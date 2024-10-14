<template>
  <div class="connectivity-graph">
    <iframe
      ref="connectivityGraphFrame"
      src="https://mapcore-demo.org/curation/flatmap/connectivity-graph/"
      width="100%"
      height="100%"
    />
  </div>
</template>

<script>
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
  },
  mounted() {
    this.loadConnectivityGraph();
  },
  methods: {
    loadConnectivityGraph: function () {
      console.log('Connnectivity Graph Component', this.entry)
      const iframeRef = this.$refs.connectivityGraphFrame;
      if (iframeRef) {
        iframeRef.onload = function() {
          console.log('iframeRef.contentWindow', iframeRef.contentWindow)
          iframeRef.contentWindow.postMessage({ backgroundColor: 'lightblue' }, iframeRef.src);
        };
      }
    },
  }
}
</script>

<style lang="scss" scoped>
  .connectivity-graph {
    width: 100%;
    height: 100%;

    iframe {
      width: 100%;
      border: 0 none;
    }
  }
</style>
