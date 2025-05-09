import type { ExtractPublicPropTypes } from '../../_utils'
import type {
  CollapseItemArrowSlotProps,
  CollapseItemHeaderExtraSlotProps,
  CollapseItemHeaderSlotProps
} from './interface'
import { createId, happensIn } from 'seemly'
import { useMemo } from 'vooks'
import {
  computed,
  defineComponent,
  h,
  inject,
  type PropType,
  toRef,
  type VNode
} from 'vue'
import { NBaseIcon } from '../../_internal'
import {
  ChevronLeftIcon as ArrowLeftIcon,
  ChevronRightIcon as ArrowRightIcon
} from '../../_internal/icons'
import { useConfig } from '../../_mixins'
import { useRtl } from '../../_mixins/use-rtl'
import {
  resolveSlotWithTypedProps,
  resolveWrappedSlotWithProps,
  throwError
} from '../../_utils'
import { collapseInjectionKey } from './Collapse'
import NCollapseItemContent from './CollapseItemContent'

export const collapseItemProps = {
  title: String,
  name: [String, Number] as PropType<string | number>,
  disabled: Boolean,
  displayDirective: String as PropType<'if' | 'show'>
} as const

export type CollapseItemProps = ExtractPublicPropTypes<typeof collapseItemProps>

export interface CollapseItemSlots {
  default?: () => VNode[]
  header?: (props: CollapseItemHeaderSlotProps) => VNode[]
  'header-extra'?: (props: CollapseItemHeaderExtraSlotProps) => VNode[]
  arrow?: (props: CollapseItemArrowSlotProps) => VNode[]
}

export default defineComponent({
  name: 'CollapseItem',
  props: collapseItemProps,
  setup(props) {
    const { mergedRtlRef } = useConfig(props)
    const randomName = createId()
    const mergedNameRef = useMemo(() => {
      return props.name ?? randomName
    })
    const NCollapse = inject(collapseInjectionKey)
    if (!NCollapse) {
      throwError(
        'collapse-item',
        '`n-collapse-item` must be placed inside `n-collapse`.'
      )
    }
    const {
      expandedNamesRef,
      props: collapseProps,
      mergedClsPrefixRef,
      slots: collapseSlots
    } = NCollapse

    const collapsedRef = computed<boolean>(() => {
      const { value: expandedNames } = expandedNamesRef
      if (Array.isArray(expandedNames)) {
        const { value: name } = mergedNameRef
        return !~expandedNames.findIndex(
          expandedName => expandedName === name
        )
      }
      else if (expandedNames) {
        const { value: name } = mergedNameRef
        return name !== expandedNames
      }
      return true
    })
    const rtlEnabledRef = useRtl('Collapse', mergedRtlRef, mergedClsPrefixRef)
    return {
      rtlEnabled: rtlEnabledRef,
      collapseSlots,
      randomName,
      mergedClsPrefix: mergedClsPrefixRef,
      collapsed: collapsedRef,
      triggerAreas: toRef(collapseProps, 'triggerAreas'),
      mergedDisplayDirective: computed<'if' | 'show'>(() => {
        const { displayDirective } = props
        if (displayDirective) {
          return displayDirective
        }
        else {
          return collapseProps.displayDirective
        }
      }),
      arrowPlacement: computed<'left' | 'right'>(() => {
        return collapseProps.arrowPlacement
      }),
      handleClick(e: MouseEvent) {
        let happensInArea: 'arrow' | 'main' | 'extra' = 'main'
        if (happensIn(e, 'arrow'))
          happensInArea = 'arrow'
        if (happensIn(e, 'extra'))
          happensInArea = 'extra'
        if (!collapseProps.triggerAreas.includes(happensInArea)) {
          return
        }
        if (NCollapse && !props.disabled) {
          NCollapse.toggleItem(collapsedRef.value, mergedNameRef.value, e)
        }
      }
    }
  },
  render() {
    const {
      collapseSlots,
      $slots,
      arrowPlacement,
      collapsed,
      mergedDisplayDirective,
      mergedClsPrefix,
      disabled,
      triggerAreas
    } = this
    const headerNode = resolveSlotWithTypedProps(
      $slots.header,
      { collapsed },
      () => [this.title]
    )
    const headerExtraSlot
      = $slots['header-extra'] || collapseSlots['header-extra']
    const arrowSlot = $slots.arrow || collapseSlots.arrow
    return (
      <div
        class={[
          `${mergedClsPrefix}-collapse-item`,
          `${mergedClsPrefix}-collapse-item--${arrowPlacement}-arrow-placement`,
          disabled && `${mergedClsPrefix}-collapse-item--disabled`,
          !collapsed && `${mergedClsPrefix}-collapse-item--active`,
          triggerAreas.map((area) => {
            return `${mergedClsPrefix}-collapse-item--trigger-area-${area}`
          })
        ]}
      >
        <div
          class={[
            `${mergedClsPrefix}-collapse-item__header`,
            !collapsed && `${mergedClsPrefix}-collapse-item__header--active`
          ]}
        >
          <div
            class={`${mergedClsPrefix}-collapse-item__header-main`}
            onClick={this.handleClick}
          >
            {arrowPlacement === 'right' && headerNode}
            <div
              class={`${mergedClsPrefix}-collapse-item-arrow`}
              key={this.rtlEnabled ? 0 : 1}
              data-arrow
            >
              {resolveSlotWithTypedProps(arrowSlot, { collapsed }, () => [
                <NBaseIcon clsPrefix={mergedClsPrefix}>
                  {{
                    default: () =>
                      this.rtlEnabled ? <ArrowLeftIcon /> : <ArrowRightIcon />
                  }}
                </NBaseIcon>
              ])}
            </div>
            {arrowPlacement === 'left' && headerNode}
          </div>
          {resolveWrappedSlotWithProps(
            headerExtraSlot,
            { collapsed },
            children => (
              <div
                class={`${mergedClsPrefix}-collapse-item__header-extra`}
                onClick={this.handleClick}
                data-extra
              >
                {children}
              </div>
            )
          )}
        </div>
        <NCollapseItemContent
          clsPrefix={mergedClsPrefix}
          displayDirective={mergedDisplayDirective}
          show={!collapsed}
        >
          {$slots}
        </NCollapseItemContent>
      </div>
    )
  }
})
