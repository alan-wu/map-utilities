<template>
  <div>
    <el-row v-if="title">
      <el-col :span="12">
        <div class="title-text">
          {{ title }}
        </div>
      </el-col>
    </el-row>
    <div class="tree-container">
      <el-tree
        ref="regionTree"
        v-loading="!isReady"
        element-loading-background="rgba(0, 0, 0, 0.3)"
        show-checkbox
        :node-key="nodeKey"
        :data="treeData"
        :check-strictly="false"
        :expand-on-click-node="false"
        :render-after-expand="false"
        :default-expanded-keys="expandedKeys"
        @check="checkChanged"
      >
        <template #default="{ node, data }">
          <span
            v-if="mapType === 'flatmap'"
            class="region-tree-node"
            :class="{
              activeItem: nodeIsActive(data),
              hoverItem: nodeIsHover(data),
            }"
            @click="changeActiveByNode(data)"
            @mouseover="changeHoverByNode(data)"
          >
            <div :style="getBackgroundStyles(data)">
              {{ node.label }}
            </div>
          </span>
          <span
            v-else-if="mapType === 'scaffold'"
            class="region-tree-node"
            :class="{
              activeItem: active.includes(data.id),
              hoverItem: hover.includes(data.id),
            }"
            @click="changeActiveByNode(data, true)"
            @mouseover="changeHoverByNode(data, true)"
          >
            <el-color-picker
              v-if="data.isPrimitives"
              :class="{ 'show-picker': showColourPicker }"
              v-model="data.activeColour"
              size="small"
              :popper-class="myPopperClass"
              @change="setColour(data, $event)"
            />
            <span>{{ node.label }}</span>
            <span v-if="data.isTextureSlides" class="node-options">
              (Texture)
            </span>
          </span>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import {
  ElTree as Tree,
  ElColorPicker as ColorPicker,
  ElRow as Row,
  ElCol as Col,
} from "element-plus";

/**
 * A vue component for toggling visibility of various regions.
 */
export default {
  name: "TreeControls",
  components: {
    Tree,
    ColorPicker,
    Row,
    Col,
  },
  props: {
    mapType: {
      type: String,
      required: true,
    },
    isReady: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
    },
    treeData: {
      type: Array,
      default: function () {
        return [];
      },
    },
    showColourPicker: {
      type: Boolean,
      default: false,
    },
    active: {
      type: [String, Array],
      required: true,
    },
    hover: {
      type: [String, Array],
      required: true,
    },
  },
  data: function () {
    return {
      defaultExpandedKeys: ["All"],
      myPopperClass: "hide-scaffold-colour-popup",
    };
  },
  computed: {
    isFlatmap: function () {
      return this.mapType === "flatmap";
    },
    isScaffold: function () {
      return this.mapType === "scaffold";
    },
    nodeKey: function () {
      if (this.isFlatmap) {
        return "key";
      } else if (this.isScaffold) {
        return "id";
      }
    },
    expandedKeys: function () {
      if (this.isFlatmap) {
        return this.defaultExpandedKeys;
      } else if (this.isScaffold) {
        return [];
      }
    },
  },
  watch: {
    showColourPicker: {
      immediate: true,
      handler: function () {
        if (this.showColourPicker) this.myPopperClass = "showPicker";
        else this.myPopperClass = "hide-scaffold-colour-popup";
      },
    },
  },
  methods: {
    setColour: function (nodeData, value) {
      this.$emit("setColour", nodeData, value);
    },
    getBackgroundStyles: function (node) {
      if ("colour" in node) {
        return { background: node.colour };
      }
      return {};
    },
    nodeIsActive: function (data) {
      return this.active === data.models;
    },
    nodeIsHover: function (data) {
      return this.hover === data.models;
    },
    changeActiveByNode: function (data, propagate = false) {
      if (this.isFlatmap) {
        if (data.models) {
          this.$emit("changeActive", data.models);
        }
      } else if (this.isScaffold) {
        if (data.isPrimitives || data.isRegion) {
          this.$emit("changeActive", data, propagate);
        }
      }
    },
    changeHoverByNode: function (data, propagate = false) {
      if (this.isFlatmap) {
        if (data.models) {
          this.$emit("changeHover", data.models);
        }
      } else if (this.isScaffold) {
        if (data.isPrimitives) {
          this.$emit("changeHover", data, propagate);
        }
      }
    },
    checkChanged: function (node, data) {
      if (this.isFlatmap) {
        const isChecked = data.checkedKeys.includes(node.key);
        if (node.key === "All") {
          this.$emit("checkAll", isChecked);
        } else {
          this.$emit("checkChanged", { key: node.key, value: isChecked });
        }
      } else if (this.isScaffold) {
        this.$emit("checkChanged", node, data);
      }
    },
  },
  unmounted: function () {
    this.sortedPrimitiveGroups = undefined;
  },
};
</script>

<style lang="scss" scoped>
:deep(.el-loading-spinner) {
  .path {
    stroke: $app-primary-color;
  }

  .el-loading-text {
    color: $app-primary-color;
  }
}

.title-text {
  width: 59px;
  height: 20px;
  color: rgb(48, 49, 51);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  margin-left: 8px;
}

.tree-container {
  width: 260px;
  border: 1px solid rgb(144, 147, 153);
  border-radius: 4px;
  background: #ffffff;
  margin-top: 6px;
  scrollbar-width: thin;

  :deep(.el-tree) {
    max-height: 240px;
    min-height: 130px;
    overflow: auto;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      box-shadow: inset 0 0 6px #c0c4cc;
    }
  }

  :deep(.el-tree-node__content) {
    height: 22px;
  }
}

:deep(.el-checkbox__input) {
  &.is-indeterminate,
  &.is-checked {
    .el-checkbox__inner {
      background-color: $app-primary-color;
      border-color: $app-primary-color;
    }
  }
}

:deep(
    .el-tree-node__children
      .el-tree-node__children
      .el-tree-node__content
      > label.el-checkbox
  ) {
  display: none;
}

:deep(.el-checkbox__label) {
  padding-left: 5px;
  color: $app-primary-color !important;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0px;
  line-height: 14px;
}

.activeItem {
  background-color: #bbb !important;
}

.hoverItem {
  background-color: #eee !important;
}

.region-tree-node {
  flex: 1;
  color: $app-primary-color !important;
  display: flex;
  font-size: 12px;
  line-height: 14px;
  padding-left: 0px;
  background-color: #fff;
  width: 100%;

  :deep(.el-color-picker) {
    height: 14px !important;
  }

  :deep(.el-color-picker__trigger) {
    margin-left: 8px;
    margin-right: 8px;
    padding: 0px;
    height: 14px;
    width: 14px;
    border: 0px;
  }
}

:deep(.el-color-picker__color) {
  border: 1px solid $app-primary-color;
}

:deep(.el-color-picker__icon) {
  &.el-icon-arrow-down {
    display: none;
  }
}

:deep(.show-picker) {
  .el-color-picker__icon {
    &.el-icon-arrow-down {
      display: block;
    }
  }
}

.hide-scaffold-colour-popup {
  display: none;
}

.node-options {
  text-align: right;
}
</style>
