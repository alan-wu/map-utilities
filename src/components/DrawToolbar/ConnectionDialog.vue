<template>
  <div class="dialog-container">
    <el-row>
      <el-col>
        <el-row v-if="inDrawing">
          <span class="dialog-title">Finalise drawing</span>
          <el-button-group>
            <el-button
              type="primary"
              plain
              @click="$emit('confirmDrawn', true)"
            >
              Confirm
            </el-button>
            <el-button type="primary" plain @click="$emit('cancelDrawn', true)">
              Cancel
            </el-button>
          </el-button-group>
        </el-row>
        <el-row v-else>
          <span class="dialog-title">Visualise connection</span>
          <el-button
            type="primary"
            plain
            @click="$emit('dialogDisplay', false)"
          >
            Close
          </el-button>
        </el-row>
      </el-col>
    </el-row>
    <el-row v-if="connectionExist">
      <el-col>
        <b><span>Related Features</span></b>
        <el-row v-for="(value, key) in connectionEntry" :key="key">
          <el-card :shadow="shadowDisplay(key)" @click="handleTooltip(key)">
            <span>{{ capitalise(value.label) }}</span>
          </el-card>
        </el-row>
      </el-col>
    </el-row>
  </div>
</template>

<script>
const capitalise = function (str) {
  if (str) return str.charAt(0).toUpperCase() + str.slice(1);
  return "";
};

export default {
  name: "ConnectionDialog",
  props: {
    connectionEntry: {
      type: Object,
      default: {},
    },
    inDrawing: {
      type: Boolean,
      default: false,
    },
    connectionExist: {
      type: Boolean,
      default: false,
    },
  },
  data: function () {
    return {
      tooltipId: undefined,
    };
  },
  methods: {
    shadowDisplay: function (value) {
      return this.tooltipId === value ? "always" : "hover";
    },
    capitalise: function (label) {
      return capitalise(label);
    },
    handleTooltip: function (value) {
      this.tooltipId = this.tooltipId === value ? undefined : value;
      this.$emit("featureTooltip", this.tooltipId);
    },
  },
};
</script>

<style lang="scss" scoped>
.dialog-container {
  width: 200px;
  height: fit-content;
  text-align: justify;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  background: #fff;
  border: 1px solid $app-primary-color;
  display: flex;
  flex-direction: column;
  padding: 0.8em;
}

.dialog-title {
  font-size: 18px;
  font-weight: bold;
  color: rgb(131, 0, 191);
}

.el-button {
  margin: 5px 0px;
}

:deep(.el-card) {
  width: 100%;
  --el-card-padding: 8px;
  border: 0;
  cursor: pointer;
}
</style>
