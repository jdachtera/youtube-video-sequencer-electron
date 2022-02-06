import { count } from "console"
import { PropAliases } from "solid-js/web"
import { css } from "solid-styled-components"
import { Label } from "./Label"
import ScrewHead from './svg/screw_head.svg'
export const LCDLabel = (props) => {
  return (
    <span class={css`
      font-family: 'oswald';
      font-size: 14px;
      font-variant: small-caps;
      margin-right: 10px;
      min-width: ${props.minWidth ?? '80px'};
      `}>{props.children}</span>
  )
}

export const LCDLine = (props) => {
  return (
    <div></div>
  )
}

export const PowerSwitch = (props) => {
  return (
    <div>poweronoff</div>
  )
}

export const ButtonWithLabel = (props) => {
  return (
    <div class={css`
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
    `}>
      <div class={css`
        border: 3px inset white;
        border-radius: 3px;
        padding: 1px;
        //background-color: #555;
        box-shadow: inset 0 0 1px 1px #333;
      `}>
        <button type="button" onMouseDown={props.onClick} class={css`
          border: 2px outset white;
          padding: 10px;
          border-radius: 1px;
          background: radial-gradient(#c2c2c2, #fff);
          font-family: 'oswald';
          font-weight: bold;
          font-size: 14px;
          font-variant: small-caps;
          &:active {
            border: 2px inset white;
          }
          `}>
            {props.children}
        </button>
      </div>
      <Label label={props.label} class={css`margin-left: 20px; white-space: nowrap;`}/>
    </div>
  )
}

export const Screw = (props) => {
  return(
      <img src={ScrewHead} width="15px" class={css`
      box-shadow: 0 0 1px 1px #585858;
      border-radius: 100%;
      margin: 4px;
      border: 2px inset white;
    `}/>
  )
}

export const ScrewRow = (props) => {

  const renderScrews = (props) => {
    let count = props.count ?? 1;
    count.forEach(() => {
      return(
        <Screw/>
      )
    })
  }

  return (
    <div class={css`
    display: inline-flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  `}>
      {/* {renderScrews()} */}
      <Screw/>
      <Screw/>
      <Screw/>
  </div>
  )
}

export const ModuleFrame = (props) => {
  return(
    <div class={css`
      display: flex;
      flex-direction: column;
    `}>
    <ScrewRow/>
      <div class={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 10px;
        padding-left: 20px;
        padding-right: 20px;
      `}>
       {props.children}
      </div>
    <ScrewRow/>
  </div>
  )
}

