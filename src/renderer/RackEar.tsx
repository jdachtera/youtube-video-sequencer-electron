import { css } from 'solid-styled-components';
import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';
import ScrewHead from '../../assets/svg/screw_head.svg';
import { Screw } from './UI';

const rackEarStyle = css`
  display: flex;
  flex-direction: column;
  box-shadow: 0px 0px 2px #222;
  justify-content: space-between;
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
    <Screw/>
    <Screw/>
  </div>
  )
}

export default RackEar;
