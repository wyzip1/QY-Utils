<template>
  <div class="resize-area" :style="`--translate-x: ${translate}px`">
    <div
      class="move-area"
      v-if="enableResize"
      @mousemove="resize"
      @mouseup="endResize"
    ></div>
    <div
      class="left-area"
      :style="widthL ? `--width: ${widthL}px; flex: unset;` : ''"
    >
      <slot name="left"></slot>
    </div>
    <div
      :class="{ line: true, active: enableResize }"
      @mousedown="startResize"
    ></div>
    <div
      class="right-area"
      :style="widthR ? `--width: ${widthR}px; flex: unset;` : ''"
    >
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ widthL?: number; widthR?: number }>();

const enableResize = ref<boolean>(false);
const translate = ref<number>(0);
let startX = 0;
let catchTranslate = 0;

function startResize(e: MouseEvent) {
  const ev = e as IMouseEvent<HTMLDivElement>;
  startX = ev.clientX;
  catchTranslate = translate.value;
  enableResize.value = true;
}

function resize(e: MouseEvent) {
  const ev = e as IMouseEvent<HTMLDivElement>;
  translate.value = catchTranslate + startX - ev.clientX;
}

function endResize() {
  startX = 0;
  catchTranslate = translate.value;
  enableResize.value = false;
}
</script>

<style lang="scss" scoped>
.resize-area {
  display: flex;
  position: relative;
  overflow: hidden;
  .move-area {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 1000;
    cursor: col-resize;
  }

  .left-area,
  .right-area {
    --width: calc(50% - 3px);
    flex: 1;
    flex-shrink: 0;
    height: 100%;
  }

  .left-area {
    position: relative;
    z-index: 20;
    width: calc(var(--width) - var(--translate-x));
  }

  .right-area {
    width: calc(var(--width) + var(--translate-x));
  }

  .line {
    padding: 0 2px;
    height: 100%;
    cursor: col-resize;

    &::after {
      content: "";
      display: block;
      width: 2px;
      height: 100%;
      background-color: #ddd;
    }

    &:hover,
    &.active {
      &::after {
        background-color: rgb(72, 123, 234);
      }
    }
  }
}
</style>
