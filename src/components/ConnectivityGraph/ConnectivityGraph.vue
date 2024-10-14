<template>
  <div class="connectivity-graph">

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
}
</script>

<style lang="scss" scoped>
  .connectivity-graph {

  }
</style>
