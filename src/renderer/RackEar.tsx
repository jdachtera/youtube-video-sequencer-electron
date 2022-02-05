import { css } from 'solid-styled-components';
import ScrewHeadWithHole from '../../assets/svg/screw_head_with_hole.svg';

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

export default RackEar;
