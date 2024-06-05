<script setup>
import { ref, onMounted } from "vue";
import { Setting as ElIconSetting } from "@element-plus/icons-vue";
import AnnotationToolbar from "./components/AnnotationToolbar.vue";

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

onMounted(() => {
  console.log("🚀 ~ onMounted ~ appRef:", appRef.value);
});

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
function finaliseDrawn() {
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
            v-if="
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
            v-if="
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
            v-if="
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
          <el-col :span="8" v-if="activeDrawTool">
            <el-button @click="finishNewDrawn" size="small">
              Finish New Drawn
            </el-button>
          </el-col>
          <el-col
            :span="8"
            v-if="
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
          <el-col :span="8" v-if="Object.keys(connectionEntry).length > 0">
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
    <AnnotationToolbar
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
      @confirmDrawn="finaliseDrawn"
      @cancelDrawn="finaliseDrawn"
      ref="toolbarPopover"
    />
    <AnnotationToolbar
      v-else
      :toolbarOptions="scaffoldToolbarOptions"
      :activeDrawTool="activeDrawTool"
      :activeDrawMode="activeDrawMode"
      :hoverVisibilities="hoverVisibilities"
      @clickToolbar="toolbarEvent"
      ref="toolbarPopover"
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
</style>
