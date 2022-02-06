import { css } from 'solid-styled-components';
import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import ScrewHead from '../../assets/svg/screw_head.svg';

const rackEarStyle = css`
  display: flex;
  flex-direction: column;
  //box-shadow: 0px 0px 4px #222;
  justify-content: space-between;

  //border: none !important;
  //background: rgb(254, 243, 241) !important;
  // background: radial-gradient(
  //   circle,
  //   rgb(255, 255, 255) 0%,
  //   #e2e2e2 80%
  // ) !important;
`;

const screwStyle = css`
  margin: 8px;
  width: 35px;
`;

const RackEar = () => {
  return (
    <div class={rackEarStyle}>
      <img alt="screw" src={ScrewHeadWithHole} class={screwStyle} />
      <img alt="screw" src={ScrewHeadWithHole} class={screwStyle} />
    </div>
  );
};

export const RackEar2 = () => {
  return (
    <div class={css`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `}>
    <img src={ScrewHead} width="15px" class={css`
      box-shadow: 0 0 1px 1px #585858;
      border-radius: 100%;
      margin: 4px;
    `}></img>
    <img src={ScrewHead} width="15px"  class={css`
      box-shadow: 0 0 1px 1px #585858;
      border-radius: 100%;
      margin: 4px;
      margin-top: 20px;
    `}></img>
  </div>
  )
}

export default RackEar;
