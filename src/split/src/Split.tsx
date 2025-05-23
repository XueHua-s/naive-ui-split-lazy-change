import type { SplitOnUpdateSize } from './types'
import { off, on } from 'evtd'
import { depx } from 'seemly'
import { useMergedState } from 'vooks'
import {
  computed,
  type CSSProperties,
  defineComponent,
  h,
  type PropType,
  ref,
  type SlotsType,
  toRef,
  type VNode,
  watchEffect
} from 'vue'
import { type ThemeProps, useTheme, useThemeClass } from '../../_mixins'
import useConfig from '../../_mixins/use-config'
import { call, type ExtractPublicPropTypes, resolveSlot } from '../../_utils'
import { splitLight, type SplitTheme } from '../styles'
import style from './styles/index.cssr'

export const splitProps = {
  ...(useTheme.props as ThemeProps<SplitTheme>),
  direction: {
    type: String as PropType<'horizontal' | 'vertical'>,
    default: 'horizontal'
  },
  resizeTriggerSize: {
    type: Number,
    default: 3
  },
  disabled: Boolean,
  defaultSize: {
    type: [String, Number] as PropType<string | number>,
    default: 0.5
  },
  'onUpdate:size': [Function, Array] as PropType<
    SplitOnUpdateSize | SplitOnUpdateSize[]
  >,
  onUpdateSize: [Function, Array] as PropType<
    SplitOnUpdateSize | SplitOnUpdateSize[]
  >,
  lazy: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  size: [String, Number] as PropType<string | number>,
  min: {
    type: [String, Number] as PropType<string | number>,
    default: 0
  },
  max: {
    type: [String, Number] as PropType<string | number>,
    default: 1
  },
  pane1Class: String,
  pane1Style: [Object, String] as PropType<CSSProperties | string>,
  pane2Class: String,
  pane2Style: [Object, String] as PropType<CSSProperties | string>,
  onDragStart: Function as PropType<(e: Event) => void>,
  onDragMove: Function as PropType<(e: Event) => void>,
  onDragEnd: Function as PropType<(e: Event) => void>,
  watchProps: Array as PropType<Array<'defaultSize'>>
} as const

export type SplitProps = ExtractPublicPropTypes<typeof splitProps>

export interface SplitSlots {
  default?: () => VNode[]
  1?: () => VNode[]
  2?: () => VNode[]
  'resize-trigger'?: () => VNode[]
}

export default defineComponent({
  name: 'Split',
  props: splitProps,
  slots: Object as SlotsType<SplitSlots>,
  setup(props) {
    const { mergedClsPrefixRef, inlineThemeDisabled } = useConfig(props)
    const themeRef = useTheme(
      'Split',
      '-split',
      style,
      splitLight,
      props,
      mergedClsPrefixRef
    )

    const cssVarsRef = computed(() => {
      const {
        common: { cubicBezierEaseInOut },
        self: { resizableTriggerColor, resizableTriggerColorHover }
      } = themeRef.value
      return {
        '--n-bezier': cubicBezierEaseInOut,
        '--n-resize-trigger-color': resizableTriggerColor,
        '--n-resize-trigger-color-hover': resizableTriggerColorHover
      }
    })
    const resizeTriggerElRef = ref<HTMLElement | null>(null)
    const isDraggingRef = ref(false)
    const controlledSizeRef = toRef(props, 'size')
    const uncontrolledSizeRef = ref(props.defaultSize)
    if (props.watchProps?.includes('defaultSize')) {
      watchEffect(() => (uncontrolledSizeRef.value = props.defaultSize))
    }
    // Update controlled or uncontrolled size values
    const doUpdateSize = (size: number | string): void => {
      const _onUpdateSize = props['onUpdate:size']
      if (props.onUpdateSize)
        call(props.onUpdateSize, size as string & number)
      if (_onUpdateSize)
        call(_onUpdateSize, size as string & number)
      uncontrolledSizeRef.value = size
    }
    const mergedSizeRef = useMergedState(controlledSizeRef, uncontrolledSizeRef)
    // When lazy is true, save the new size to pendingSizeRef during dragging
    const pendingSizeRef = ref(mergedSizeRef.value)
    // Styles for real-time display of drag and drop indicator lines
    const indicatorStyle = ref<CSSProperties>({})

    const firstPaneStyle = computed(() => {
      const sizeValue = mergedSizeRef.value
      if (typeof sizeValue === 'string') {
        return {
          flex: `0 0 ${sizeValue}`
        }
      }
      else if (typeof sizeValue === 'number') {
        const size = sizeValue * 100
        return {
          flex: `0 0 calc(${size}% - ${
            (props.resizeTriggerSize * size) / 100
          }px)`
        }
      }
    })

    const resizeTriggerStyle = computed(() => {
      return props.direction === 'horizontal'
        ? {
            width: `${props.resizeTriggerSize}px`,
            height: '100%'
          }
        : {
            width: '100%',
            height: `${props.resizeTriggerSize}px`
          }
    })

    const resizeTriggerWrapperStyle = computed(() => {
      const horizontal = props.direction === 'horizontal'
      return {
        width: horizontal ? `${props.resizeTriggerSize}px` : '',
        height: horizontal ? '' : `${props.resizeTriggerSize}px`,
        cursor: props.direction === 'horizontal' ? 'col-resize' : 'row-resize'
      }
    })

    let offset = 0
    const handleMouseDown = (e: MouseEvent): void => {
      e.preventDefault()
      isDraggingRef.value = true
      if (props.onDragStart)
        props.onDragStart(e)
      const mouseMoveEvent = 'mousemove'
      const mouseUpEvent = 'mouseup'
      const onMouseMove = (e: MouseEvent): void => {
        updateSize(e)
        if (props.onDragMove)
          props.onDragMove(e)
      }
      const onMouseUp = (e: MouseEvent): void => {
        // Update the size at the end of dragging in lazy mode and clear the indicator line
        if (props.lazy) {
          doUpdateSize(pendingSizeRef.value)
          indicatorStyle.value = {}
        }
        off(mouseMoveEvent, document, onMouseMove)
        off(mouseUpEvent, document, onMouseUp)
        isDraggingRef.value = false
        if (props.onDragEnd)
          props.onDragEnd(e)
        document.body.style.cursor = ''
      }
      document.body.style.cursor = resizeTriggerWrapperStyle.value.cursor
      on(mouseMoveEvent, document, onMouseMove)
      on(mouseUpEvent, document, onMouseUp)

      const resizeTriggerEl = resizeTriggerElRef.value
      if (resizeTriggerEl) {
        const elRect = resizeTriggerEl.getBoundingClientRect()
        if (props.direction === 'horizontal') {
          offset = e.clientX - elRect.left
        }
        else {
          offset = elRect.top - e.clientY
        }
      }
      updateSize(e)
    }

    function updateSize(event: MouseEvent): void {
      const containerRect
        = resizeTriggerElRef.value?.parentElement?.getBoundingClientRect()
      if (!containerRect)
        return

      const { direction } = props

      const containerUsableWidth = containerRect.width - props.resizeTriggerSize
      const containerUsableHeight
        = containerRect.height - props.resizeTriggerSize
      const containerUsableSize
        = direction === 'horizontal'
          ? containerUsableWidth
          : containerUsableHeight

      const newPxSize
        = direction === 'horizontal'
          ? event.clientX - containerRect.left - offset
          : event.clientY - containerRect.top + offset

      const { min, max } = props
      const pxMin
        = typeof min === 'string' ? depx(min) : min * containerUsableSize
      const pxMax
        = typeof max === 'string' ? depx(max) : max * containerUsableSize

      let nextPxSize = newPxSize
      nextPxSize = Math.max(nextPxSize, pxMin)
      nextPxSize = Math.min(nextPxSize, pxMax, containerUsableSize)

      let newSize: number | string
      if (typeof mergedSizeRef.value === 'string') {
        newSize = `${nextPxSize}px`
      }
      else {
        newSize = nextPxSize / containerUsableSize
      }
      // Judging from lazy whether to update immediately
      if (props.lazy) {
        pendingSizeRef.value = newSize
        // Update the indicator line style, the indicator line follows the mouse
        if (direction === 'horizontal') {
          indicatorStyle.value = {
            position: 'absolute',
            left: `${nextPxSize}px`,
            top: '0',
            bottom: '0',
            width: '1px',
            background: cssVarsRef.value['--n-resize-trigger-color-hover']
          }
        }
        else {
          indicatorStyle.value = {
            position: 'absolute',
            top: `${nextPxSize}px`,
            left: '0',
            right: '0',
            height: '1px',
            background: cssVarsRef.value['--n-resize-trigger-color-hover']
          }
        }
      }
      else {
        doUpdateSize(newSize)
      }
    }

    const themeClassHandle = inlineThemeDisabled
      ? useThemeClass('split', undefined, cssVarsRef, props)
      : undefined

    return {
      themeClass: themeClassHandle?.themeClass,
      onRender: themeClassHandle?.onRender,
      cssVars: inlineThemeDisabled ? undefined : cssVarsRef,
      resizeTriggerElRef,
      isDragging: isDraggingRef,
      mergedClsPrefix: mergedClsPrefixRef,
      resizeTriggerWrapperStyle,
      resizeTriggerStyle,
      handleMouseDown,
      firstPaneStyle,
      indicatorStyle,
      lazy: props.lazy
    }
  },
  render() {
    this.onRender?.()
    return (
      <div
        class={[
          `${this.mergedClsPrefix}-split`,
          `${this.mergedClsPrefix}-split--${this.direction}`,
          this.themeClass
        ]}
        style={[this.cssVars as CSSProperties, { position: 'relative' }]}
      >
        <div
          class={[`${this.mergedClsPrefix}-split-pane-1`, this.pane1Class]}
          style={[this.firstPaneStyle, this.pane1Style]}
        >
          {this.$slots[1]?.()}
        </div>
        {!this.disabled && (
          <div
            ref="resizeTriggerElRef"
            class={`${this.mergedClsPrefix}-split__resize-trigger-wrapper`}
            style={this.resizeTriggerWrapperStyle}
            onMousedown={this.handleMouseDown}
          >
            {resolveSlot(this.$slots['resize-trigger'], () => [
              <div
                style={this.resizeTriggerStyle}
                class={[
                  `${this.mergedClsPrefix}-split__resize-trigger`,
                  this.isDragging
                  && `${this.mergedClsPrefix}-split__resize-trigger--hover`
                ]}
              >
              </div>
            ])}
          </div>
        )}
        {this.lazy && this.isDragging && (
          <div
            class={`${this.mergedClsPrefix}-split__resize-indicator`}
            style={this.indicatorStyle}
          >
          </div>
        )}
        <div
          class={[`${this.mergedClsPrefix}-split-pane-2`, this.pane2Class]}
          style={this.pane2Style}
        >
          {this.$slots[2]?.()}
        </div>
      </div>
    )
  }
})
