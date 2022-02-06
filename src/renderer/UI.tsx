import { PropAliases } from "solid-js/web"
import { css } from "solid-styled-components"

export const LCDLabel = (props) => {
  return (
    <span class={css`
      font-family: 'oswald';
      font-size: 14px;
      font-variant: small-caps;
      margin-right: 10px;
      min-width: 40px;
      `}>{props.children}</span>
  )
}

export const PowerSwitch = (props) => {
  return (
    <div>poweronoff</div>
  )
}

