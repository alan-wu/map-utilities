<template>
  <el-tooltip
    :content="textLabel"
    placement="bottom"
    :hide-after="autoHideTimeout"
    effect="clipboard-tooltip"
    @hide="resetSettings"
  >
    <el-button
      class="copy-clipboard-button"
      :class="theme"
      size="small"
      @click="copyToClipboard"
    >
      <el-icon :color="iconColor">
        <el-icon-copy-document />
      </el-icon>
      <span class="visually-hidden">{{ textLabel }}</span>
    </el-button>
  </el-tooltip>
</template>

<script>
const labelBefore = 'Copy to clipboard';
const labelAfter = 'Copied!';
const appPrimaryColor = '#8300bf';

export default {
  name: 'CopyToClipboard',
  props: {
    content: {
      type: String,
      default: '',
    },
    /**
     * `theme: light` will show white button,
     * to use when the button is over other readable text content.
     * Default button is transparent.
     */
    theme: {
      type: String,
      default: '',
    },
  },
  data: function () {
    return {
      textLabel: labelBefore,
      autoHideTimeout: 0,
      iconColor: appPrimaryColor,
    };
  },
  methods: {
    copyToClipboard: async function () {
      let copiedSuccessfully = true;
      this.autoHideTimeout = 600;

      try {
        const htmlContent = this.content.replaceAll('\n', '');
        const tempElement = document.createElement('div');
        tempElement.innerHTML = this.content;
        const plainTextContent = tempElement.textContent || tempElement.innerText || '';

        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainTextContent], { type: 'text/plain' });

        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        });

        await navigator.clipboard.write([clipboardItem]);
      } catch (err) {
        console.error(
          "Error when trying to use navigator.clipboard.write()",
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
    padding: 0.25rem;
    font-size: 14px !important;
    transition: all 0.25s ease;

    &,
    &:focus,
    &:active {
      color: $app-primary-color !important;
      background: transparent;
      border-color: transparent !important;
    }

    &.light {
      &,
      &:focus,
      &:active {
        background: #fff;
        border-color: #fff !important;
      }
    }

    &:hover {
      background: #f3e6f9 !important;
      border-color: #f3e6f9 !important;
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
