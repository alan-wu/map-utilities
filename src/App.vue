<script setup>
import { ref, onMounted, watch } from "vue";
import { Setting as ElIconSetting } from "@element-plus/icons-vue";

import DrawToolbar from "./components/DrawToolbar.vue";
import HelpModeDialog from "./components/HelpModeDialog.vue";

const flatmapToolbarOptions = [
  "Edit",
  "Delete",
  "Point",
  "LineString",
  "Polygon",
  "Connection",
];
const scaffoldToolbarOptions = ["Edit", "Point", "LineString"];
const activeDrawTool = ref(undefined);
const activeDrawMode = ref(undefined);
const hoverVisibilities = [
  { value: false, refs: "toolbarPopover", ref: "editPopover" },
  { value: false, refs: "toolbarPopover", ref: "deletePopover" },
  { value: false, refs: "toolbarPopover", ref: "pointPopover" },
  { value: false, refs: "toolbarPopover", ref: "lineStringPopover" },
  { value: false, refs: "toolbarPopover", ref: "polygonPopover" },
  { value: false, refs: "toolbarPopover", ref: "connectionPopover" },
];
const isFlatmap = ref(true);
const appRef = ref(null);
const newlyDrawnEntry = ref({});
const connectionEntry = ref({});
const drawnType = ref("All tools");
const drawnTypes = [
  { value: "All tools", label: "All tools" },
  { value: "Point", label: "Point" },
  { value: "LineString", label: "LineString" },
  { value: "Polygon", label: "Polygon" },
  { value: "None", label: "None" },
];
const helpMode = ref(false);
const helpModeActiveItem = ref(0);
const helpModeLastItem = ref(false);
const useHelpModeDialog = ref(false);

onMounted(() => {
  console.log("🚀 ~ onMounted ~ appRef:", appRef.value);
});

watch(drawnType, () => {
  finaliseNewDrawn();
});

function showHelpModeDialog(type, name) {
  helpMode.value = true;
  useHelpModeDialog.value = true;
}
function onHelpModeShowNext() {
  console.log(
    "🚀 ~ onHelpModeShowNext ~ helpModeActiveItem:",
    helpModeActiveItem.value
  );
  helpModeActiveItem.value += 1;
}
function onFinishHelpMode() {
  helpMode.value = false;
  // reset help mode to default values
  helpModeActiveItem.value = 0;
  helpModeLastItem.value = false;
}
function toolbarEvent(type, name) {
  console.log("🚀 ~ toolbarEvent ~ type, name:", type, name);
  connectionEntry.value = {};
  if (type === "mode") {
    activeDrawMode.value = name;
  } else if (type === "tool") {
    activeDrawTool.value = name;
  }
}
function startNewDrawn(type) {
  activeDrawTool.value = type;
  newlyDrawnEntry.value = {};
  connectionEntry.value = {};
}
function finishNewDrawn() {
  newlyDrawnEntry.value = {
    id: 1,
    value: "newly drawn entry",
  };
}
function addConnection() {
  connectionEntry.value = {
    " 1026": {
      id: 1026,
      label: "body proper",
      models: "UBERON:0013702",
    },
    " 4958": {
      id: 4958,
      label: "liver",
      models: "UBERON:0002107",
    },
  };
}
function removeConnection() {
  connectionEntry.value = {};
}
function featureTooltip(value) {
  console.log("🚀 ~ featureTooltip ~ value:", value);
}
function finaliseNewDrawn() {
  activeDrawTool.value = undefined;
  newlyDrawnEntry.value = {};
  connectionEntry.value = {};
}
</script>

<template>
  <div ref="appRef">
    <div class="maplibregl-canvas"></div>
    <el-popover
      placement="bottom"
      trigger="click"
      width="600"
      popper-class="popover options-popover"
      :teleported="false"
    >
      <div class="options-container">
        <el-row>
          <el-col>
            <h3>HelpModeDialog</h3>
          </el-col>
          <el-col>
            <el-button @click="showHelpModeDialog" size="small">
              Show HelpMode Dialog
            </el-button>
            <el-button
              v-if="helpMode && useHelpModeDialog"
              @click="onHelpModeShowNext"
              size="small"
            >
              Show Next
            </el-button>
            <el-button
              v-if="helpMode && useHelpModeDialog"
              @click="onFinishHelpMode"
              size="small"
            >
              Hide HelpMode Dialog
            </el-button>
          </el-col>
        </el-row>
        <el-row>
          <el-col>
            <h3>DrawToolbar</h3>
          </el-col>
          <el-col>
            <el-switch
              v-model="isFlatmap"
              active-text="Flatmap"
              inactive-text="Scaffold"
            />
          </el-col>
        </el-row>
        <el-row v-show="isFlatmap">
          <el-col>
            <el-select
              v-model="drawnType"
              placeholder="Select"
              style="width: 120px"
            >
              <el-option
                v-for="item in drawnTypes"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-col>
        </el-row>
        <el-row v-show="isFlatmap">
          <el-col
            :span="8"
            v-show="
              (!activeDrawTool || activeDrawTool === 'Point') &&
              (drawnType === 'All tools' ||
                drawnType === 'Point' ||
                drawnType === 'None')
            "
          >
            <el-button @click="startNewDrawn('Point')" size="small">
              Draw New Point
            </el-button>
          </el-col>
          <el-col
            :span="8"
            v-show="
              (!activeDrawTool || activeDrawTool === 'LineString') &&
              (drawnType === 'All tools' ||
                drawnType === 'LineString' ||
                drawnType === 'None')
            "
          >
            <el-button @click="startNewDrawn('LineString')" size="small">
              Draw New LineString
            </el-button>
          </el-col>
          <el-col
            :span="8"
            v-show="
              (!activeDrawTool || activeDrawTool === 'Polygon') &&
              (drawnType === 'All tools' ||
                drawnType === 'Polygon' ||
                drawnType === 'None')
            "
          >
            <el-button @click="startNewDrawn('Polygon')" size="small">
              Draw New Polygon
            </el-button>
          </el-col>
          <el-col :span="8" v-show="activeDrawTool">
            <el-button @click="finishNewDrawn" size="small">
              Finish New Drawn
            </el-button>
          </el-col>
          <el-col :span="8" v-show="Object.keys(newlyDrawnEntry).length > 0">
            <el-button @click="finaliseNewDrawn" size="small">
              Finalise New Drawn
            </el-button>
          </el-col>
          <el-col
            :span="8"
            v-show="
              (!activeDrawTool || activeDrawTool === 'LineString') &&
              (drawnType === 'All tools' ||
                drawnType === 'LineString' ||
                drawnType === 'None')
            "
          >
            <el-button @click="addConnection" size="small">
              Add Connection
            </el-button>
          </el-col>
          <el-col :span="8" v-show="Object.keys(connectionEntry).length > 0">
            <el-button @click="removeConnection" size="small">
              Remove Connection
            </el-button>
          </el-col>
        </el-row>
      </div>
      <template #reference>
        <el-button class="options-button" :icon="ElIconSetting">
          Options
        </el-button>
      </template>
    </el-popover>
    <DrawToolbar
      v-if="isFlatmap"
      :mapCanvas="{
        containerHTML: appRef,
        class: '.maplibregl-canvas',
      }"
      :toolbarOptions="flatmapToolbarOptions"
      :drawnType="drawnType"
      :activeDrawTool="activeDrawTool"
      :activeDrawMode="activeDrawMode"
      :newlyDrawnEntry="newlyDrawnEntry"
      :connectionEntry="connectionEntry"
      :hoverVisibilities="hoverVisibilities"
      @clickToolbar="toolbarEvent"
      @featureTooltip="featureTooltip"
      @confirmDrawn="finaliseNewDrawn"
      @cancelDrawn="finaliseNewDrawn"
      ref="toolbarPopover"
    />
    <DrawToolbar
      v-else
      :toolbarOptions="scaffoldToolbarOptions"
      :activeDrawTool="activeDrawTool"
      :activeDrawMode="activeDrawMode"
      :hoverVisibilities="hoverVisibilities"
      @clickToolbar="toolbarEvent"
      ref="toolbarPopover"
    />
    <HelpModeDialog
      v-if="helpMode && useHelpModeDialog"
      class="help-mode-dialog"
      :lastItem="helpModeLastItem"
      @show-next="onHelpModeShowNext"
      @finish-help-mode="onFinishHelpMode"
    />
  </div>
</template>

<style scoped>
.options-button {
  z-index: 100;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.options-container {
  text-align: center;
}
.help-mode-dialog {
  position: absolute;
  top: 50%;
}
</style>
