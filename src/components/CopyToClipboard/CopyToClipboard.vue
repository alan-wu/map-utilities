<template>
  <el-tooltip
    :content="textLabel"
    placement="bottom"
    :hide-after="autoHideTimeout"
    effect="clipboard-tooltip"
    @hide="resetSettings"
  >
    <el-button class="copy-clipboard-button"
      size="small"
      @click="copyToClipboard"
    >
      <el-icon color="white">
        <el-icon-copy-document />
      </el-icon>
      <span class="visually-hidden">{{ textLabel }}</span>
    </el-button>
  </el-tooltip>
</template>

<script>
const labelBefore = 'Copy to clipboard';
const labelAfter = 'Copied!';

export default {
  name: 'CopyToClipboard',
  props: {
    content: {
      type: String,
      default: '',
    }
  },
  data: function () {
    return {
      textLabel: labelBefore,
      autoHideTimeout: 0,
    };
  },
  methods: {
    copyToClipboard: async function () {
      let copiedSuccessfully = true;
      this.autoHideTimeout = 600;

      try {
        await navigator.clipboard.writeText(this.content);
      } catch (err) {
        console.error(
          "Error when trying to use navigator.clipboard.writeText()",
          err
        );
        copiedSuccessfully = false;
      }

      if (copiedSuccessfully) {
        this.textLabel = labelAfter;
      } else {
        this.textLabel = 'Error trying to copy to clipboard!';
      }
    },
    resetSettings: function () {
      this.autoHideTimeout = 0;
      this.textLabel = labelBefore;
    },
  }
}
</script>

<style lang="scss" scoped>
  .copy-clipboard-button {
    margin-left: 0px !important;
    margin-top: 0px !important;
    font-size: 14px !important;
    transition: all 0.25s ease;

    &,
    &:focus,
    &:active {
      color: #fff !important;
      background: $app-primary-color;
      border-color: $app-primary-color !important;
    }

    &:hover {
      background: #ac76c5 !important;
      border-color: #ac76c5 !important;
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
  .el-popper.is-clipboard-tooltip {
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
